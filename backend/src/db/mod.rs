use mongodb::{Client, Collection, Database};
use crate::models::{User, Country, LeaderboardEntry};
use std::env;

#[derive(Clone)]
pub struct DbClient {
    pub db: Database,
}

impl DbClient {
    pub async fn new() -> anyhow::Result<Self> {
        let uri = env::var("MONGO_URI").unwrap_or_else(|_| "mongodb://localhost:27017".to_string());
        let client = Client::with_uri_str(&uri).await?;
        let db_name = env::var("DB_NAME").unwrap_or_else(|_| "guesswhat".to_string());
        let db = client.database(&db_name);
        log::info!("Connected to MongoDB at {}", uri);
        Ok(Self { db })
    }

    pub fn users(&self) -> Collection<User> {
        self.db.collection("users")
    }

    pub fn countries(&self) -> Collection<Country> {
        self.db.collection("countries")
    }

    pub fn leaderboard(&self) -> Collection<LeaderboardEntry> {
        self.db.collection("leaderboard")
    }
}
