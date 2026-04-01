use serde::{Deserialize, Serialize};

/// WebSocket messages sent FROM the client TO the server
#[derive(Debug, Clone, Deserialize)]
#[serde(tag = "type", rename_all = "SCREAMING_SNAKE_CASE")]
pub enum ClientMessage {
    /// Join or create a room
    JoinRoom {
        room_id: String,
        username: String,
        token: Option<String>,
    },
    /// Host starts the game
    StartGame,
    /// Player submits an answer (text)
    SubmitAnswer {
        answer: String,
        timestamp_ms: u64,
    },
    /// Player votes (index 0/1/2) for rarest flag
    Vote {
        choice: u8,
        timestamp_ms: u64,
    },
    /// Host updates room settings
    UpdateSettings {
        settings: crate::models::room::RoomSettings,
    },
    /// Heartbeat
    Ping,
}

/// WebSocket messages sent FROM the server TO the client
#[derive(Debug, Clone, Serialize)]
#[serde(tag = "type", rename_all = "SCREAMING_SNAKE_CASE")]
pub enum ServerMessage {
    /// Current room state (sent on join and whenever state changes)
    RoomState {
        room: crate::models::room::Room,
    },
    /// A new round is starting
    RoundStart {
        round: u8,
        total_rounds: u8,
        timer_secs: u8,
        question: crate::games::RoundQuestion,
    },
    /// Round ended — reveal answer + scores
    RoundEnd {
        correct_answer: String,
        round_scores: Vec<RoundScore>,
        total_scores: Vec<RoundScore>,
    },
    /// Game over
    GameOver {
        leaderboard: Vec<RoundScore>,
    },
    /// Another player joined
    PlayerJoined {
        player: crate::models::room::Player,
    },
    /// A player left
    PlayerLeft {
        player_id: String,
        username: String,
    },
    /// Countdown before game starts
    Countdown {
        seconds: u8,
    },
    /// Answer acknowledged (without revealing correctness until round end)
    AnswerAck {
        player_id: String,
    },
    /// Error message
    Error {
        message: String,
    },
    /// Pong response
    Pong,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RoundScore {
    pub player_id: String,
    pub username: String,
    pub score_this_round: i64,
    pub total_score: i64,
    pub answer: Option<String>,
    pub correct: bool,
}
