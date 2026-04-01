use actix_web::{web, HttpResponse};
use mongodb::bson::doc;
use futures::TryStreamExt;

use crate::db::DbClient;
use crate::models::LeaderboardEntry;

/// GET /api/leaderboard?mode=flag_frenzy&limit=20
async fn get_leaderboard(
    db: web::Data<DbClient>,
    query: web::Query<std::collections::HashMap<String, String>>,
) -> HttpResponse {
    let mode = query.get("mode").cloned().unwrap_or_default();
    let limit = query.get("limit")
        .and_then(|l| l.parse::<i64>().ok())
        .unwrap_or(20)
        .min(100);

    use mongodb::options::FindOptions;
    let options = FindOptions::builder()
        .sort(doc! { "score": -1 })
        .limit(limit)
        .build();

    let filter = if mode.is_empty() {
        doc! {}
    } else {
        doc! { "game_mode": &mode }
    };

    match db.leaderboard().find(filter).with_options(options).await {
        Ok(cursor) => {
            match cursor.try_collect::<Vec<LeaderboardEntry>>().await {
                Ok(entries) => HttpResponse::Ok().json(entries),
                Err(_) => HttpResponse::InternalServerError().finish(),
            }
        }
        Err(_) => HttpResponse::InternalServerError().finish(),
    }
}

pub fn configure(cfg: &mut web::ServiceConfig) {
    cfg.service(
        web::scope("/leaderboard")
            .route("", web::get().to(get_leaderboard))
    );
}
