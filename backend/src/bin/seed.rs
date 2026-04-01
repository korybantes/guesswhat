use dotenv::dotenv;
use mongodb::bson::doc;
use futures::TryStreamExt;

// Include the DB module from the main crate
include!("../db/mod.rs");
include!("../models/mod.rs");

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    dotenv().ok();
    env_logger::init_from_env(env_logger::Env::default().default_filter_or("info"));

    let db = DbClient::new().await?;

    let count = db.countries().count_documents(doc! {}).await?;
    if count > 0 {
        log::info!("Database already seeded with {} countries. Use --force to reseed.", count);
        return Ok(());
    }

    let countries = get_countries();
    log::info!("Seeding {} countries...", countries.len());

    db.countries().drop().await?;
    db.countries().insert_many(countries).await?;

    // Create indexes
    use mongodb::IndexModel;
    use mongodb::options::IndexOptions;

    db.countries().create_index(
        IndexModel::builder().keys(doc! { "code": 1 })
            .options(IndexOptions::builder().unique(true).build())
            .build()
    ).await?;

    db.users().create_index(
        IndexModel::builder().keys(doc! { "username": 1 })
            .options(IndexOptions::builder().unique(true).build())
            .build()
    ).await?;

    log::info!("✅ Database seeded successfully!");
    Ok(())
}

fn get_countries() -> Vec<Country> {
    let data = include_str!("flags_data.json");
    serde_json::from_str(data).expect("Failed to parse flags_data.json")
}
