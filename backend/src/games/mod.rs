pub mod flag_frenzy;
pub mod rarest_flag;
pub mod spelling_bee;
pub mod capital_guesser;

use serde::{Deserialize, Serialize};
use crate::models::Country;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum GameMode {
    FlagFrenzy,
    RarestFlag,
    SpellingBee,
    CapitalGuesser,
}

impl std::fmt::Display for GameMode {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            GameMode::FlagFrenzy => write!(f, "flag_frenzy"),
            GameMode::RarestFlag => write!(f, "rarest_flag"),
            GameMode::SpellingBee => write!(f, "spelling_bee"),
            GameMode::CapitalGuesser => write!(f, "capital_guesser"),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RoundData {
    pub round_type: GameMode,
    pub question: RoundQuestion,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "kind", rename_all = "snake_case")]
pub enum RoundQuestion {
    /// Show a flag, guess the country name (or pick from options)
    GuessFlag {
        country_code: String,
        country_name: String,
        flag_url: String,
        options: Option<Vec<String>>, // Some = multiple choice
        rarity_score: f64,
    },
    /// Show a color category, pick the rarest flag from 3 options
    RarestPick {
        category: String, // "Flags with red"
        choices: Vec<FlagChoice>,
    },
    /// Show a flag, spell the country
    SpellIt {
        country_code: String,
        flag_url: String,
        country_name: String, // revealed after round
    },
    /// Show a flag, guess the capital
    GuessCapital {
        country_code: String,
        country_name: String,
        flag_url: String,
        correct_capital: String,
        options: Option<Vec<String>>,
    },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FlagChoice {
    pub id: u8,
    pub country_code: String,
    pub country_name: String,
    pub flag_url: String,
    pub rarity_score: f64,
}

pub fn flag_url(code: &str) -> String {
    format!("https://flagcdn.com/w320/{}.png", code.to_lowercase())
}

pub fn flag_url_svg(code: &str) -> String {
    format!("https://flagcdn.com/{}.svg", code.to_lowercase())
}

/// Score calculation for flag frenzy / capital guesser
pub fn calculate_speed_score(elapsed_ms: u64, timer_ms: u64, rarity_score: f64) -> i64 {
    if elapsed_ms > timer_ms {
        return 0;
    }
    let time_factor = 1.0 - (elapsed_ms as f64 / timer_ms as f64);
    let base = 100.0;
    let rarity_bonus = (rarity_score / 100.0) * 50.0; // up to +50 for legendary flags
    ((base + rarity_bonus) * time_factor).round() as i64
}

/// Score for spelling bee using Levenshtein similarity
pub fn calculate_spelling_score(answer: &str, correct: &str, elapsed_ms: u64, timer_ms: u64) -> i64 {
    let a = answer.trim().to_lowercase();
    let c = correct.trim().to_lowercase();
    if a == c {
        // Perfect — speed bonus
        let time_factor = 1.0 - (elapsed_ms as f64 / timer_ms as f64).min(1.0);
        return (100.0 + 50.0 * time_factor).round() as i64;
    }
    let dist = strsim::levenshtein(&a, &c);
    let max_len = c.len().max(1);
    let similarity = 1.0 - (dist as f64 / max_len as f64);
    if similarity >= 0.8 {
        (similarity * 60.0).round() as i64 // partial credit
    } else {
        0
    }
}

/// Build list of unique color categories from countries
pub fn color_categories_for_rarest(countries: &[Country]) -> Vec<String> {
    let mut cats: std::collections::HashSet<String> = std::collections::HashSet::new();
    for c in countries {
        for color in &c.colors {
            cats.insert(format!("Flags with {}", color));
        }
    }
    let mut v: Vec<String> = cats.into_iter().collect();
    v.sort();
    v
}
