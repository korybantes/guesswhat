use serde::{Deserialize, Serialize};
use mongodb::bson::oid::ObjectId;
use chrono::{DateTime, Utc};

pub mod room;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct User {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    pub id: Option<ObjectId>,
    pub username: String,
    pub password_hash: Option<String>, // None for guests
    pub is_guest: bool,
    pub total_score: i64,
    pub games_played: i64,
    pub games_won: i64,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Country {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    pub id: Option<ObjectId>,
    pub name: String,
    pub code: String, // ISO 3166-1 alpha-2
    pub capital: String,
    pub flag_emoji: String,
    pub rarity_score: f64, // 1.0 = common, 100.0 = ultra rare
    pub colors: Vec<String>, // ["red", "blue", "white"]
    pub continent: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LeaderboardEntry {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    pub id: Option<ObjectId>,
    pub username: String,
    pub score: i64,
    pub game_mode: String,
    pub played_at: DateTime<Utc>,
}
