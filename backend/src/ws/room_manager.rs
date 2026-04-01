use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::{RwLock, broadcast};
use chrono::Utc;
use rand::distributions::Alphanumeric;
use rand::Rng;

use crate::models::room::{Room, RoomSettings, RoomVisibility, RoomSummary, GamePhase, Player};
use crate::ws::messages::ServerMessage;

pub type RoomTx = broadcast::Sender<ServerMessage>;

pub struct RoomEntry {
    pub room: Room,
    pub tx: RoomTx,
}

pub struct RoomManager {
    pub rooms: HashMap<String, RoomEntry>,
}

impl RoomManager {
    pub fn new() -> Self {
        RoomManager {
            rooms: HashMap::new(),
        }
    }

    /// Generate a unique 6-char invite code
    pub fn generate_room_id(&self) -> String {
        loop {
            let id: String = rand::thread_rng()
                .sample_iter(&Alphanumeric)
                .take(6)
                .map(|c| (c as char).to_uppercase().next().unwrap())
                .collect();
            if !self.rooms.contains_key(&id) {
                return id;
            }
        }
    }

    /// Create a new room, returning the room id and broadcast channel
    pub fn create_room(&mut self, settings: RoomSettings) -> (String, RoomTx) {
        let id = self.generate_room_id();
        let (tx, _) = broadcast::channel::<ServerMessage>(64);
        let room = Room::new(id.clone(), settings);
        self.rooms.insert(id.clone(), RoomEntry { room, tx: tx.clone() });
        log::info!("Room created: {}", id);
        (id, tx)
    }

    /// Get a broadcast sender for an existing room (to subscribe)
    pub fn get_tx(&self, room_id: &str) -> Option<RoomTx> {
        self.rooms.get(room_id).map(|e| e.tx.clone())
    }

    /// Get a snapshot of the room state
    pub fn get_room(&self, room_id: &str) -> Option<&Room> {
        self.rooms.get(room_id).map(|e| &e.room)
    }

    pub fn get_room_mut(&mut self, room_id: &str) -> Option<&mut Room> {
        self.rooms.get_mut(room_id).map(|e| &mut e.room)
    }

    pub fn broadcast(&self, room_id: &str, msg: ServerMessage) {
        if let Some(entry) = self.rooms.get(room_id) {
            let _ = entry.tx.send(msg);
        }
    }

    /// Add a player to a room. Returns the broadcast tx if successful.
    pub fn join_room(
        &mut self,
        room_id: &str,
        player: Player,
    ) -> Result<RoomTx, String> {
        let entry = self.rooms.get_mut(room_id).ok_or("Room not found")?;
        if entry.room.is_full() {
            return Err("Room is full".to_string());
        }
        if entry.room.phase != GamePhase::Lobby {
            return Err("Game already in progress".to_string());
        }
        let tx = entry.tx.clone();
        let _ = tx.send(ServerMessage::PlayerJoined { player: player.clone() });
        entry.room.players.insert(player.id.clone(), player);
        Ok(tx)
    }

    pub fn remove_player(&mut self, room_id: &str, player_id: &str) -> bool {
        if let Some(entry) = self.rooms.get_mut(room_id) {
            if let Some(player) = entry.room.players.remove(player_id) {
                let _ = entry.tx.send(ServerMessage::PlayerLeft {
                    player_id: player_id.to_string(),
                    username: player.username,
                });
                // If room is empty, remove it
                if entry.room.players.is_empty() {
                    self.rooms.remove(room_id);
                    return true;
                }
                // Transfer host if needed
                let entry = self.rooms.get_mut(room_id).unwrap();
                if !entry.room.players.values().any(|p| p.is_host) {
                    if let Some(new_host) = entry.room.players.values_mut().next() {
                        new_host.is_host = true;
                    }
                }
                return true;
            }
        }
        false
    }

    /// Public room listing
    pub fn list_public_rooms(&self) -> Vec<RoomSummary> {
        self.rooms
            .values()
            .filter(|e| {
                e.room.settings.visibility == RoomVisibility::Public
                    && e.room.phase == GamePhase::Lobby
            })
            .map(|e| RoomSummary {
                id: e.room.id.clone(),
                game_mode: e.room.settings.game_mode.to_string(),
                player_count: e.room.player_count(),
                max_players: e.room.settings.max_players,
                phase: e.room.phase.clone(),
            })
            .collect()
    }
}
