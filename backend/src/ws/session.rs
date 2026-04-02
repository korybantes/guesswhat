use actix_web::{web, HttpRequest, HttpResponse, Error};
use actix_ws::Message;
use futures_util::StreamExt;
use std::sync::Arc;
use tokio::sync::RwLock;
use uuid::Uuid;
use rand::Rng;

use crate::SharedRoomManager;
use crate::db::DbClient;
use crate::models::room::{Player, RoomSettings, GamePhase};
use crate::games::{GameMode, RoundQuestion, flag_url_svg};
use crate::ws::messages::{ClientMessage, ServerMessage, RoundScore};
use crate::ws::room_manager::RoomTx;

pub async fn ws_handler(
    req: HttpRequest,
    body: web::Payload,
    room_id: web::Path<String>,
    rm: web::Data<SharedRoomManager>,
    db: web::Data<DbClient>,
) -> Result<HttpResponse, Error> {
    let (response, mut session, mut msg_stream) = actix_ws::handle(&req, body)?;

    let room_id = room_id.into_inner().to_uppercase();
    let player_id = Uuid::new_v4().to_string();
    let rm_clone = rm.clone();
    let db_clone = db.clone();

    actix_web::rt::spawn(async move {
        // Wait for the first JoinRoom message to set up the player
        let join_result = handle_join(
            &mut session,
            &mut msg_stream,
            &room_id,
            &player_id,
            &rm_clone,
        ).await;

        let tx = match join_result {
            Ok(tx) => tx,
            Err(e) => {
                let _ = session.text(
                    serde_json::to_string(&ServerMessage::Error { message: e }).unwrap()
                ).await;
                let _ = session.close(None).await;
                return;
            }
        };

        // Send initial room state
        {
            let rm = rm_clone.read().await;
            if let Some(room) = rm.get_room(&room_id) {
                let msg = ServerMessage::RoomState { room: room.clone() };
                let _ = session.text(serde_json::to_string(&msg).unwrap()).await;
            }
        }

        let mut rx = tx.subscribe();

        loop {
            tokio::select! {
                // Messages from other players (broadcast)
                Ok(broadcast_msg) = rx.recv() => {
                    let text = serde_json::to_string(&broadcast_msg).unwrap();
                    if session.text(text).await.is_err() {
                        break;
                    }
                }
                // Messages from this client
                Some(Ok(msg)) = msg_stream.next() => {
                    match msg {
                        Message::Text(text) => {
                            let handled = handle_client_message(
                                &text,
                                &mut session,
                                &room_id,
                                &player_id,
                                &rm_clone,
                                &db_clone,
                            ).await;
                            if !handled { break; }
                        }
                        Message::Close(_) => break,
                        Message::Ping(b) => { let _ = session.pong(&b).await; }
                        _ => {}
                    }
                }
                else => break,
            }
        }

        // Cleanup
        let mut rm = rm_clone.write().await;
        rm.remove_player(&room_id, &player_id);
        log::info!("Player {} disconnected from room {}", player_id, room_id);
    });

    Ok(response)
}

async fn handle_join(
    session: &mut actix_ws::Session,
    msg_stream: &mut actix_ws::MessageStream,
    room_id: &str,
    player_id: &str,
    rm: &SharedRoomManager,
) -> Result<RoomTx, String> {
    // Wait for JoinRoom message with a timeout
    while let Some(Ok(msg)) = msg_stream.next().await {
        if let Message::Text(text) = msg {
            match serde_json::from_str::<ClientMessage>(&text) {
                Ok(ClientMessage::JoinRoom { room_id: _, username, token: _ }) => {
                    // Determine guest vs registered
                    let is_guest = true; // TODO: validate token for registered users
                    let mut rm = rm.write().await;

                    // Check if room exists, if not create with defaults
                    let room_exists = rm.get_room(room_id).is_some();
                    let is_first = !room_exists || rm.get_room(room_id)
                        .map(|r| r.players.is_empty())
                        .unwrap_or(true);

                    if !room_exists {
                        return Err("Room not found".to_string());
                    }

                    let player = Player {
                        id: player_id.to_string(),
                        username,
                        is_guest,
                        score: 0,
                        is_host: is_first,
                        is_ready: false,
                        answered_this_round: false,
                    };

                    rm.join_room(room_id, player)
                        .map_err(|e| e)
                }
                Ok(_) => return Err("Expected JOIN_ROOM first".to_string()),
                Err(e) => return Err(format!("Parse error: {}", e)),
            }
            .map_err(|e| e)?;
            // Need to return the tx — re-fetch it
            let rm = rm.read().await;
            return rm.get_tx(room_id).ok_or_else(|| "Room vanished".to_string());
        }
    }
    Err("Connection closed before join".to_string())
}

async fn handle_client_message(
    text: &str,
    session: &mut actix_ws::Session,
    room_id: &str,
    player_id: &str,
    rm: &SharedRoomManager,
    db: &DbClient,
) -> bool {
    let msg: ClientMessage = match serde_json::from_str(text) {
        Ok(m) => m,
        Err(e) => {
            let err = ServerMessage::Error { message: format!("Invalid message: {}", e) };
            let _ = session.text(serde_json::to_string(&err).unwrap()).await;
            return true;
        }
    };

    match msg {
        ClientMessage::Ping => {
            let _ = session.text(serde_json::to_string(&ServerMessage::Pong).unwrap()).await;
        }

        ClientMessage::StartGame => {
            let is_host = {
                let rm = rm.read().await;
                rm.get_room(room_id)
                    .and_then(|r| r.players.get(player_id))
                    .map(|p| p.is_host)
                    .unwrap_or(false)
            };
            if !is_host {
                let err = ServerMessage::Error { message: "Only the host can start the game".to_string() };
                let _ = session.text(serde_json::to_string(&err).unwrap()).await;
                return true;
            }
            // Spawn game runner
            let room_id_owned = room_id.to_string();
            let rm_clone = rm.clone();
            let db_clone = db.clone();
            actix_web::rt::spawn(async move {
                run_game(room_id_owned, rm_clone, db_clone).await;
            });
        }

        ClientMessage::SubmitAnswer { answer, timestamp_ms } => {
            let mut rm = rm.write().await;
            if let Some(room) = rm.get_room_mut(room_id) {
                if let Some(player) = room.players.get_mut(player_id) {
                    if !player.answered_this_round {
                        player.answered_this_round = true;
                        // Store answer in round state - simplified: just broadcast ack
                        let ack = ServerMessage::AnswerAck { player_id: player_id.to_string() };
                        rm.broadcast(room_id, ack);
                    }
                }
            }
        }

        ClientMessage::Vote { choice, timestamp_ms } => {
            let mut rm = rm.write().await;
            if let Some(room) = rm.get_room_mut(room_id) {
                if let Some(player) = room.players.get_mut(player_id) {
                    if !player.answered_this_round {
                        player.answered_this_round = true;
                        let ack = ServerMessage::AnswerAck { player_id: player_id.to_string() };
                        rm.broadcast(room_id, ack);
                    }
                }
            }
        }

        ClientMessage::UpdateSettings { settings } => {
            let mut rm = rm.write().await;
            let is_host = rm.get_room(room_id)
                .and_then(|r| r.players.get(player_id))
                .map(|p| p.is_host)
                .unwrap_or(false);
            if is_host {
                if let Some(room) = rm.get_room_mut(room_id) {
                    if room.phase == GamePhase::Lobby {
                        room.settings = settings;
                        let state = ServerMessage::RoomState { room: room.clone() };
                        rm.broadcast(room_id, state);
                    }
                }
            }
        }

        _ => {}
    }
    true
}

async fn run_game(room_id: String, rm: Arc<tokio::sync::RwLock<crate::ws::RoomManager>>, db: DbClient) {
    use crate::games::*;

    // Get room settings
    let (rounds, timer_secs, game_mode) = {
        let rm = rm.read().await;
        if let Some(room) = rm.get_room(&room_id) {
            (room.settings.rounds, room.settings.timer_secs, room.settings.game_mode.clone())
        } else {
            return;
        }
    };

    // Load countries from DB
    let countries = {
        use mongodb::bson::doc;
        use futures::TryStreamExt;
        let col = db.countries();
        match col.find(doc! {}).await {
            Ok(cursor) => cursor.try_collect::<Vec<_>>().await.unwrap_or_default(),
            Err(_) => vec![],
        }
    };

    if countries.is_empty() {
        let err = ServerMessage::Error { message: "No country data found. Please seed the database.".to_string() };
        let rm = rm.read().await;
        rm.broadcast(&room_id, err);
        return;
    }

    // Countdown
    for i in (1..=3).rev() {
        {
            let rm = rm.read().await;
            rm.broadcast(&room_id, ServerMessage::Countdown { seconds: i });
        }
        tokio::time::sleep(tokio::time::Duration::from_secs(1)).await;
    }

    // Set phase
    {
        let mut rm = rm.write().await;
        if let Some(room) = rm.get_room_mut(&room_id) {
            room.phase = GamePhase::RoundActive;
        }
    }

    // Answer tracking: player_id -> (answer, timestamp_ms)
    let mut player_answers: std::collections::HashMap<String, (String, u64)> = std::collections::HashMap::new();

    for round_num in 1..=rounds {
        // Reset answered flags
        {
            let mut rm = rm.write().await;
            if let Some(room) = rm.get_room_mut(&room_id) {
                for player in room.players.values_mut() {
                    player.answered_this_round = false;
                }
                room.current_round = round_num;
                room.phase = GamePhase::RoundActive;
            }
        }
        player_answers.clear();

        // Pick a random country
        let country = {
            let idx = rand::thread_rng().gen_range(0..countries.len());
            countries[idx].clone()
        };

        let question = build_question(&game_mode, &country, &countries);
        let correct_answer = get_correct_answer(&question);

        // Broadcast round start
        {
            let rm = rm.read().await;
            rm.broadcast(&room_id, ServerMessage::RoundStart {
                round: round_num,
                total_rounds: rounds,
                timer_secs,
                question: question.clone(),
            });
        }

        // Wait for timer
        let timer_duration = tokio::time::Duration::from_secs(timer_secs as u64);
        let start = tokio::time::Instant::now();
        loop {
            tokio::time::sleep(tokio::time::Duration::from_millis(200)).await;
            let elapsed = start.elapsed();
            if elapsed >= timer_duration {
                break;
            }
            // Check if all answered
            let all_answered = {
                let rm = rm.read().await;
                if let Some(r) = rm.get_room(&room_id) {
                    r.all_answered()
                } else {
                    true
                }
            };
            if all_answered { break; }
        }

        // Calculate scores
        let timer_ms = timer_secs as u64 * 1000;
        let round_scores = {
            let mut rm = rm.write().await;
            let mut scores = vec![];
            if let Some(room) = rm.get_room_mut(&room_id) {
                room.phase = GamePhase::RoundEnd;
                for player in room.players.values_mut() {
                    let (answer, ts) = player_answers
                        .get(&player.id)
                        .cloned()
                        .unwrap_or_else(|| ("".to_string(), timer_ms));

                    let (pts, correct) = score_answer(&game_mode, &answer, &correct_answer, ts, timer_ms, country.rarity_score);
                    player.score += pts;
                    scores.push(RoundScore {
                        player_id: player.id.clone(),
                        username: player.username.clone(),
                        score_this_round: pts,
                        total_score: player.score,
                        answer: if answer.is_empty() { None } else { Some(answer) },
                        correct,
                    });
                }
                scores.sort_by(|a, b| b.score_this_round.cmp(&a.score_this_round));
            }
            scores
        };

        {
            let rm = rm.read().await;
            rm.broadcast(&room_id, ServerMessage::RoundEnd {
                correct_answer: correct_answer.clone(),
                round_scores: round_scores.clone(),
                total_scores: round_scores.clone(),
            });
        }

        // Wait between rounds
        tokio::time::sleep(tokio::time::Duration::from_secs(5)).await;
    }

    // Game over
    let leaderboard = {
        let mut rm = rm.write().await;
        let mut board = vec![];
        if let Some(room) = rm.get_room_mut(&room_id) {
            room.phase = GamePhase::GameOver;
            board = room.leaderboard().iter().map(|p| RoundScore {
                player_id: p.id.clone(),
                username: p.username.clone(),
                score_this_round: 0,
                total_score: p.score,
                answer: None,
                correct: false,
            }).collect();
        }
        board
    };

    {
        let rm = rm.read().await;
        rm.broadcast(&room_id, ServerMessage::GameOver { leaderboard });
    }
}

fn build_question(mode: &GameMode, country: &crate::models::Country, all: &[crate::models::Country]) -> RoundQuestion {
    use crate::games::*;
    match mode {
        GameMode::FlagFrenzy => {
            // Build 4 multiple choice options
            let mut options: Vec<String> = all.iter()
                .filter(|c| c.code != country.code)
                .map(|c| c.name.clone())
                .collect::<Vec<_>>();
            // Shuffle and take 3 wrong answers
            use rand::seq::SliceRandom;
            options.shuffle(&mut rand::thread_rng());
            let mut choices = vec![country.name.clone()];
            choices.extend(options.into_iter().take(3));
            choices.shuffle(&mut rand::thread_rng());

            RoundQuestion::GuessFlag {
                country_code: country.code.clone(),
                country_name: country.name.clone(),
                flag_url: flag_url_svg(&country.code),
                options: Some(choices),
                rarity_score: country.rarity_score,
            }
        }
        GameMode::SpellingBee => RoundQuestion::SpellIt {
            country_code: country.code.clone(),
            flag_url: flag_url_svg(&country.code),
            country_name: country.name.clone(),
        },
        GameMode::CapitalGuesser => {
            use rand::seq::SliceRandom;
            let mut options: Vec<String> = all.iter()
                .filter(|c| c.code != country.code)
                .map(|c| c.capital.clone())
                .collect();
            options.shuffle(&mut rand::thread_rng());
            let mut choices = vec![country.capital.clone()];
            choices.extend(options.into_iter().take(3));
            choices.shuffle(&mut rand::thread_rng());

            RoundQuestion::GuessCapital {
                country_code: country.code.clone(),
                country_name: country.name.clone(),
                flag_url: flag_url_svg(&country.code),
                correct_capital: country.capital.clone(),
                options: Some(choices),
            }
        }
        GameMode::RarestFlag => {
            use rand::seq::SliceRandom;
            // Pick a color category
            let colors = ["red", "blue", "green", "yellow", "white", "black"];
            let color = colors[rand::thread_rng().gen_range(0..colors.len())];
            let category = format!("Flags with {}", color);

            let mut matching: Vec<&crate::models::Country> = all.iter()
                .filter(|c| c.colors.contains(&color.to_string()))
                .collect();
            matching.shuffle(&mut rand::thread_rng());
            let picks = matching.into_iter().take(3).collect::<Vec<_>>();

            if picks.len() < 3 {
                // Fallback to flag frenzy if not enough matches
                return build_question(&GameMode::FlagFrenzy, country, all);
            }

            let choices = picks.iter().enumerate().map(|(i, c)| FlagChoice {
                id: i as u8,
                country_code: c.code.clone(),
                country_name: c.name.clone(),
                flag_url: flag_url_svg(&c.code),
                rarity_score: c.rarity_score,
            }).collect();

            RoundQuestion::RarestPick { category, choices }
        }
    }
}

fn get_correct_answer(q: &RoundQuestion) -> String {
    match q {
        RoundQuestion::GuessFlag { country_name, .. } => country_name.clone(),
        RoundQuestion::SpellIt { country_name, .. } => country_name.clone(),
        RoundQuestion::GuessCapital { correct_capital, .. } => correct_capital.clone(),
        RoundQuestion::RarestPick { choices, .. } => {
            // Correct = the choice with highest rarity_score
            choices.iter()
                .max_by(|a, b| a.rarity_score.partial_cmp(&b.rarity_score).unwrap())
                .map(|c| c.id.to_string())
                .unwrap_or_default()
        }
    }
}

fn score_answer(mode: &GameMode, answer: &str, correct: &str, elapsed_ms: u64, timer_ms: u64, rarity: f64) -> (i64, bool) {
    if answer.is_empty() { return (0, false); }
    match mode {
        GameMode::FlagFrenzy | GameMode::CapitalGuesser => {
            let is_correct = answer.trim().to_lowercase() == correct.trim().to_lowercase();
            if is_correct {
                (crate::games::calculate_speed_score(elapsed_ms, timer_ms, rarity), true)
            } else {
                (0, false)
            }
        }
        GameMode::SpellingBee => {
            let pts = crate::games::calculate_spelling_score(answer, correct, elapsed_ms, timer_ms);
            (pts, pts > 0)
        }
        GameMode::RarestFlag => {
            let is_correct = answer == correct;
            if is_correct {
                (crate::games::calculate_speed_score(elapsed_ms, timer_ms, 50.0), true)
            } else {
                (0, false)
            }
        }
    }
}
