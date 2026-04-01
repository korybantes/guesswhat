pub mod messages;
pub mod room_manager;
pub mod session;

use actix_web::web;

pub use room_manager::RoomManager;

pub fn configure(cfg: &mut web::ServiceConfig) {
    cfg.route("/ws/{room_id}", web::get().to(session::ws_handler));
}
