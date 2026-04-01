use actix_web::{web, HttpResponse};
use serde::{Deserialize, Serialize};

use crate::SharedRoomManager;
use crate::models::room::{RoomSettings, GamePhase, RoomVisibility};
use crate::games::GameMode;

#[derive(Deserialize)]
pub struct CreateRoomBody {
    pub game_mode: GameMode,
    pub rounds: Option<u8>,
    pub timer_secs: Option<u8>,
    pub max_players: Option<u8>,
    pub visibility: Option<RoomVisibility>,
}

#[derive(Serialize)]
pub struct CreateRoomResponse {
    pub room_id: String,
}

/// POST /api/rooms — Create a new room
async fn create_room(
    rm: web::Data<SharedRoomManager>,
    body: web::Json<CreateRoomBody>,
) -> HttpResponse {
    let settings = RoomSettings {
        game_mode: body.game_mode.clone(),
        rounds: body.rounds.unwrap_or(10).clamp(3, 20),
        timer_secs: body.timer_secs.unwrap_or(20).clamp(10, 60),
        visibility: body.visibility.clone().unwrap_or(RoomVisibility::Public),
        max_players: body.max_players.unwrap_or(8).clamp(2, 8),
    };

    let mut rm = rm.write().await;
    let (room_id, _) = rm.create_room(settings);
    HttpResponse::Created().json(CreateRoomResponse { room_id })
}

/// GET /api/rooms — List public rooms in lobby
async fn list_rooms(rm: web::Data<SharedRoomManager>) -> HttpResponse {
    let rm = rm.read().await;
    let rooms = rm.list_public_rooms();
    HttpResponse::Ok().json(rooms)
}

/// GET /api/rooms/{id} — Get room info
async fn get_room(
    rm: web::Data<SharedRoomManager>,
    room_id: web::Path<String>,
) -> HttpResponse {
    let room_id = room_id.into_inner().to_uppercase();
    let rm = rm.read().await;
    match rm.get_room(&room_id) {
        Some(room) => HttpResponse::Ok().json(room),
        None => HttpResponse::NotFound().json(serde_json::json!({ "error": "Room not found" })),
    }
}

pub fn configure(cfg: &mut web::ServiceConfig) {
    cfg.service(
        web::scope("/rooms")
            .route("", web::post().to(create_room))
            .route("", web::get().to(list_rooms))
            .route("/{id}", web::get().to(get_room))
    );
}
