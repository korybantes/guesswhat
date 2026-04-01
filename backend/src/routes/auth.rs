use actix_web::{web, HttpResponse};
use serde::{Deserialize, Serialize};
use bcrypt::{hash, verify, DEFAULT_COST};
use jsonwebtoken::{encode, Header, EncodingKey};
use chrono::Utc;
use uuid::Uuid;
use rand::distributions::Alphanumeric;
use rand::Rng;
use mongodb::bson::doc;

use crate::db::DbClient;
use crate::models::User;

#[derive(Deserialize)]
pub struct RegisterBody {
    pub username: String,
    pub password: String,
}

#[derive(Deserialize)]
pub struct LoginBody {
    pub username: String,
    pub password: String,
}

#[derive(Serialize)]
pub struct AuthResponse {
    pub token: String,
    pub username: String,
    pub is_guest: bool,
}

#[derive(Serialize, Deserialize)]
pub struct Claims {
    pub sub: String,   // user id or username
    pub username: String,
    pub is_guest: bool,
    pub exp: usize,
}

fn jwt_secret() -> String {
    std::env::var("JWT_SECRET").unwrap_or_else(|_| "changeme-secret".to_string())
}

fn make_token(sub: &str, username: &str, is_guest: bool) -> String {
    let exp = (Utc::now() + chrono::Duration::days(30)).timestamp() as usize;
    let claims = Claims { sub: sub.to_string(), username: username.to_string(), is_guest, exp };
    encode(&Header::default(), &claims, &EncodingKey::from_secret(jwt_secret().as_bytes()))
        .unwrap_or_default()
}

/// POST /api/auth/guest — get a random guest token
async fn guest_login() -> HttpResponse {
    let suffix: String = rand::thread_rng()
        .sample_iter(&Alphanumeric)
        .take(8)
        .map(char::from)
        .collect();
    let username = format!("guest-{}", suffix.to_lowercase());
    let id = Uuid::new_v4().to_string();
    let token = make_token(&id, &username, true);
    HttpResponse::Ok().json(AuthResponse { token, username, is_guest: true })
}

/// POST /api/auth/register
async fn register(db: web::Data<DbClient>, body: web::Json<RegisterBody>) -> HttpResponse {
    // Check username taken
    let existing = db.users().find_one(doc! { "username": &body.username }).await;
    if let Ok(Some(_)) = existing {
        return HttpResponse::Conflict().json(serde_json::json!({ "error": "Username taken" }));
    }

    let hash = match hash(&body.password, DEFAULT_COST) {
        Ok(h) => h,
        Err(_) => return HttpResponse::InternalServerError().finish(),
    };

    let user = User {
        id: None,
        username: body.username.clone(),
        password_hash: Some(hash),
        is_guest: false,
        total_score: 0,
        games_played: 0,
        games_won: 0,
        created_at: Utc::now(),
    };

    match db.users().insert_one(user).await {
        Ok(result) => {
            let id = result.inserted_id.to_string();
            let token = make_token(&id, &body.username, false);
            HttpResponse::Created().json(AuthResponse { token, username: body.username.clone(), is_guest: false })
        }
        Err(_) => HttpResponse::InternalServerError().finish(),
    }
}

/// POST /api/auth/login
async fn login(db: web::Data<DbClient>, body: web::Json<LoginBody>) -> HttpResponse {
    let user = match db.users().find_one(doc! { "username": &body.username }).await {
        Ok(Some(u)) => u,
        _ => return HttpResponse::Unauthorized().json(serde_json::json!({ "error": "Invalid credentials" })),
    };

    let hash = user.password_hash.unwrap_or_default();
    if !verify(&body.password, &hash).unwrap_or(false) {
        return HttpResponse::Unauthorized().json(serde_json::json!({ "error": "Invalid credentials" }));
    }

    let id = user.id.map(|o| o.to_string()).unwrap_or_default();
    let token = make_token(&id, &user.username, false);
    HttpResponse::Ok().json(AuthResponse { token, username: user.username, is_guest: false })
}

pub fn configure(cfg: &mut web::ServiceConfig) {
    cfg.service(
        web::scope("/auth")
            .route("/guest", web::post().to(guest_login))
            .route("/register", web::post().to(register))
            .route("/login", web::post().to(login))
    );
}
