use futures_util::stream::SplitSink;
use futures_util::{SinkExt, StreamExt};
use std::collections::HashMap;
use std::fs;
use std::sync::atomic::{AtomicUsize, Ordering};
use std::time::Duration;
use tokio::sync::mpsc;
use tokio::time;
use warp::ws::{Message, WebSocket};
use warp::Filter;

pub mod math;

pub mod game_desc;
use game_desc::GameDesc;

mod game;
use game::Game;
use game::{ClientMsg, RoomMsg, ServerMsg};

#[derive(Debug)]
enum RouteCmd {
    Open {
        room: String,
        send: SplitSink<WebSocket, warp::ws::Message>,
    },
    Message {
        msg: Message,
    },
    Close,
}

#[derive(Debug)]
struct Room {
    game: Game,
    clients: HashMap<usize, usize>, // player index -> client id
    pending_inputs: Vec<(usize, ClientMsg)>,
}

static NEXT_CLIENT_ID: AtomicUsize = AtomicUsize::new(0);

#[tokio::main(flavor = "current_thread")]
async fn main() {
    // Serve the game description file as JSON
    let desc = load_game_desc();
    let desc2 = load_game_desc();
    let desc_route = warp::path("desc").map(move || warp::reply::json(&desc2));

    // Serve files from the ./client directory
    let client_route = warp::fs::dir("./client/");

    let (tx, mut rx) = mpsc::unbounded_channel();

    let room_route = warp::path("socket")
        .and(warp::ws())
        .and(warp::path::param())
        .and(warp::any().map(move || tx.clone()))
        .map(|ws: warp::ws::Ws, room: String, tx| {
            ws.on_upgrade(move |ws| client_connected(ws, tx, room))
        });

    let routes = warp::get().and(room_route.or(desc_route).or(client_route));

    // Web server task
    tokio::spawn(warp::serve(routes).run(([0, 0, 0, 0], 8000)));

    // Main loop
    let mut sockets = HashMap::new();
    let mut rooms = HashMap::new();
    let mut room_lookup = HashMap::new(); // user -> room

    let mut interval = time::interval(Duration::from_millis((1000. * desc.dt) as u64));

    loop {
        interval.tick().await;

        while let Ok((id, cmd)) = rx.try_recv() {
            match cmd {
                RouteCmd::Open {
                    mut send,
                    room: room_id,
                } => {
                    let room = rooms.entry(room_id.clone()).or_insert_with(|| Room {
                        game: Game::new(desc.clone()),
                        clients: Default::default(),
                        pending_inputs: Default::default(),
                    });
                    room_lookup.insert(id, room_id.clone());

                    // Assign a player index
                    let mut player_id = 0;
                    loop {
                        if !room.clients.values().any(|p| *p == player_id) {
                            room.clients.insert(id, player_id);
                            break;
                        }
                        player_id += 1;
                    }

                    let open_msg = ServerMsg::Room(RoomMsg {
                        client_id: player_id,
                        room: room_id,
                    });
                    let open_msg = Message::text(serde_json::to_string(&open_msg).unwrap());
                    send.send(open_msg).await.unwrap();

                    let catchup_msg = room.game.catchup_msg();
                    let catchup_msg = Message::text(serde_json::to_string(&catchup_msg).unwrap());
                    send.send(catchup_msg).await.unwrap();

                    sockets.insert(id, send);
                }
                RouteCmd::Message { msg } => {
                    if let Some(room) = room_lookup.get(&id) {
                        if let Some(room) = rooms.get_mut(room) {
                            if let Some(&player_id) = room.clients.get(&id) {
                                if let Ok(text) = msg.to_str() {
                                    if let Ok(msg) = serde_json::from_str(&text) {
                                        room.pending_inputs.push((player_id, msg));
                                    } else {
                                        println!("Bad client message: {}", text);
                                    }
                                }
                            }
                        }
                    }
                }
                RouteCmd::Close => {
                    if let Some(room) = room_lookup.get(&id) {
                        if let Some(room) = rooms.get_mut(room) {
                            room.clients.remove(&id);
                        }
                    }
                    room_lookup.remove(&id);
                    sockets.remove(&id);
                }
            }
        }

        for room in rooms.values_mut() {
            room.game.process_inputs(&room.pending_inputs);
            room.pending_inputs.clear();
            let server_msg = room.game.tick();
            let text = serde_json::to_string(&server_msg).expect("Failed to serialize message");
            let msg = Message::text(text);
            for client in room.clients.keys() {
                if let Some(socket) = sockets.get_mut(client) {
                    socket.send(msg.clone()).await.unwrap();
                }
            }
        }
    }
}

fn load_game_desc() -> GameDesc {
    let desc_path = "data/game.ron";
    let desc = fs::read_to_string(desc_path).expect("Could not find game description file");
    ron::from_str(&desc).expect("Could not parse game description file")
}

async fn client_connected(
    ws: WebSocket,
    tx: mpsc::UnboundedSender<(usize, RouteCmd)>,
    room: String,
) {
    let id = NEXT_CLIENT_ID.fetch_add(1, Ordering::Relaxed);

    let (ws_tx, mut ws_rx) = ws.split();
    tx.send((id, RouteCmd::Open { send: ws_tx, room })).unwrap();

    while let Some(res) = ws_rx.next().await {
        let msg = match res {
            Ok(msg) => msg,
            Err(e) => {
                eprintln!("WS error: {}", e);
                break;
            }
        };
        tx.send((id, RouteCmd::Message { msg })).unwrap();
    }

    tx.send((id, RouteCmd::Close)).unwrap();
}
