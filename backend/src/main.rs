use dotenv::dotenv;
use actix_web::{web, App, HttpServer, middleware};
use actix_cors::Cors;
use std::sync::Arc;
use tokio::sync::RwLock;


mod models;
mod db;
mod routes;
mod ws;
mod games;

use db::DbClient;
use ws::RoomManager;

pub type SharedRoomManager = Arc<RwLock<RoomManager>>;

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    dotenv().ok();
    env_logger::init_from_env(env_logger::Env::default().default_filter_or("info"));

    let db = DbClient::new().await.expect("Failed to connect to MongoDB");
    let room_manager: SharedRoomManager = Arc::new(RwLock::new(RoomManager::new()));

    let db_data = web::Data::new(db);
    let rm_data = web::Data::new(room_manager);

    let host = std::env::var("HOST").unwrap_or_else(|_| "0.0.0.0".to_string());
    let port: u16 = std::env::var("PORT")
        .unwrap_or_else(|_| "8080".to_string())
        .parse()
        .unwrap_or(8080);

    log::info!("Starting GuessWhat server on {}:{}", host, port);

    HttpServer::new(move || {
        let cors = Cors::default()
            .allow_any_origin()
            .allow_any_method()
            .allow_any_header()
            .max_age(3600);

        App::new()
            .wrap(cors)
            .wrap(middleware::Logger::default())
            .app_data(db_data.clone())
            .app_data(rm_data.clone())
            .configure(routes::configure)
            .configure(ws::configure)
    })
    .bind((host.as_str(), port))?
    .run()
    .await
}
