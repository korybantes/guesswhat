use std::collections::HashMap;
use serde::{Deserialize, Serialize};
use chrono::{DateTime, Utc};
use crate::games::GameMode;

/// Room visibility
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum RoomVisibility {
    Public,
    Private,
}

/// Current phase of the room/game
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum GamePhase {
    Lobby,
    Starting,    // 3-second countdown
    RoundActive,
    RoundEnd,
    GameOver,
}

/// A connected player inside a room
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Player {
    pub id: String,       // session id / uuid
    pub username: String,
    pub is_guest: bool,
    pub score: i64,
    pub is_host: bool,
    pub is_ready: bool,
    pub answered_this_round: bool,
    pub last_answer: Option<String>,
    pub answer_time_ms: u64,
}

/// Room settings configured by host
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RoomSettings {
    pub game_mode: GameMode,
    pub rounds: u8,             // 5..20
    pub timer_secs: u8,         // 10..60
    pub visibility: RoomVisibility,
    pub max_players: u8,        // 2..8
}

impl Default for RoomSettings {
    fn default() -> Self {
        RoomSettings {
            game_mode: GameMode::FlagFrenzy,
            rounds: 10,
            timer_secs: 20,
            visibility: RoomVisibility::Public,
            max_players: 8,
        }
    }
}

/// The full room state — serialized and sent to clients
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Room {
    pub id: String,           // 6-char invite code
    pub settings: RoomSettings,
    pub phase: GamePhase,
    pub players: HashMap<String, Player>,
    pub current_round: u8,
    pub created_at: DateTime<Utc>,
}

impl Room {
    pub fn new(id: String, settings: RoomSettings) -> Self {
        Room {
            id,
            settings,
            phase: GamePhase::Lobby,
            players: HashMap::new(),
            current_round: 0,
            created_at: Utc::now(),
        }
    }

    pub fn player_count(&self) -> usize {
        self.players.len()
    }

    pub fn is_full(&self) -> bool {
        self.player_count() >= self.settings.max_players as usize
    }

    pub fn all_answered(&self) -> bool {
        self.players.values().all(|p| p.answered_this_round)
    }

    pub fn leaderboard(&self) -> Vec<Player> {
        let mut players: Vec<Player> = self.players.values().cloned().collect();
        players.sort_by(|a, b| b.score.cmp(&a.score));
        players
    }
}

/// Room list item (for lobby browser)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RoomSummary {
    pub id: String,
    pub game_mode: String,
    pub player_count: usize,
    pub max_players: u8,
    pub phase: GamePhase,
}
