pub mod auth;
pub mod rooms;
pub mod leaderboard;

use actix_web::web;

pub fn configure(cfg: &mut web::ServiceConfig) {
    cfg.service(
        web::scope("/api")
            .configure(auth::configure)
            .configure(rooms::configure)
            .configure(leaderboard::configure)
    );
}
