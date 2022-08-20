use std::fs;
use warp::Filter;

mod game_desc;
use game_desc::GameDesc;

#[tokio::main(flavor = "current_thread")]
async fn main() {
    // Serve the game description file as JSON
    let desc = load_game_desc();
    let desc_route = warp::path("desc").map(move || warp::reply::json(&desc));

    // Serve files from the ./client directory
    let client_route = warp::fs::dir("./client/");

    let routes = warp::get().and(desc_route.or(client_route));

    warp::serve(routes).run(([127, 0, 0, 1], 8000)).await;
}

fn load_game_desc() -> GameDesc {
    let desc_path = "data/game.ron";
    let desc = fs::read_to_string(desc_path).expect("Could not find game description file");
    ron::from_str(&desc).expect("Could not parse game description file")
}
