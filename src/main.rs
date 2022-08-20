#[tokio::main(flavor = "current_thread")]
async fn main() {
    // Serve files from the ./client directory
    let client = warp::fs::dir("./client/");

    warp::serve(client).run(([127, 0, 0, 1], 8000)).await;
}
