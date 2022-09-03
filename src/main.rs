use futures_util::stream::SplitSink;
use futures_util::{SinkExt, StreamExt};
use std::collections::HashMap;
use std::fs;
use std::sync::atomic::{AtomicUsize, Ordering};
use tokio::sync::mpsc;
use warp::ws::{Message, WebSocket};
use warp::Filter;
use std::time::Duration;
use tokio::time;

pub mod math;

pub mod game_desc;
use game_desc::GameDesc;

mod game;
use game::Game;
use game::{ClientMsg, ServerMsg, RoomMsg};

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

#[derive(Default, Debug)]
struct Room {
    game: Option<Game>,
    clients: Vec<usize>,
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
    tokio::spawn(warp::serve(routes).run(([127, 0, 0, 1], 8000)));

    // Main loop
    let mut sockets = HashMap::new();
    let mut rooms = HashMap::new();
    let mut room_lookup = HashMap::new(); // user -> room

    let mut interval = time::interval(Duration::from_millis(200));

    loop {
        interval.tick().await;

        while let Ok((id, cmd)) = rx.try_recv() {
            match cmd {
                RouteCmd::Open { mut send, room: room_id } => {
                    let open_msg = ServerMsg::Room(RoomMsg {
                        client_id: id,
                        room: room_id.clone(),
                    });
                    let open_msg = Message::text(serde_json::to_string(&open_msg).unwrap());
                    send.send(open_msg).await.unwrap();

                    sockets.insert(id, send);
                    let room = rooms.entry(room_id.clone()).or_insert(Room::default());
                    room.clients.push(id);
                    room_lookup.insert(id, room_id);
                    if room.clients.len() == 2 {
                        room.game = Some(Game::new(desc.clone()));
                    }
                }
                RouteCmd::Message { msg } => {
                    if let Some(room) = room_lookup.get(&id) {
                        if let Some(room) = rooms.get_mut(room) {
                            if let Ok(text) = msg.to_str() {
                                if let Ok(msg) = serde_json::from_str(&text) {
                                    room.pending_inputs.push((id, msg));
                                } else {
                                    println!("Bad client message: {}", text);
                                }
                            }
                        }
                    }
                }
                RouteCmd::Close => {
                    sockets.remove(&id);
                }
            }
        }

        for room in rooms.values_mut() {
            if let Some(game) = &mut room.game {
                game.process_inputs(&room.pending_inputs);
                room.pending_inputs.clear();
                let server_msg = game.tick();
                let text = serde_json::to_string(&server_msg).expect("Failed to serialize message");
                let msg = Message::text(text);
                for client in &room.clients {
                    if let Some(socket) = sockets.get_mut(client) {
                        socket.send(msg.clone()).await.unwrap();
                    }
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

async fn client_connected(ws: WebSocket, tx: mpsc::UnboundedSender<(usize, RouteCmd)>, room: String) {
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
