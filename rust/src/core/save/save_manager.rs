use serde::{Deserialize, Serialize};
use crate::core::overworld::RunState;

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct SaveData {
    pub version: i32,
    pub run_state: RunState,
    pub timestamp: u64,
}

impl SaveData {
    pub fn new(run_state: RunState) -> Self {
        let timestamp = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .map(|d| d.as_secs())
            .unwrap_or(0);
        Self { version: 1, run_state, timestamp }
    }
}

pub fn save_to_string(run_state: &RunState) -> Result<String, String> {
    let data = SaveData::new(run_state.clone());
    serde_json::to_string_pretty(&data).map_err(|e| format!("Serialize error: {}", e))
}

pub fn load_from_string(json: &str) -> Result<RunState, String> {
    let data: SaveData = serde_json::from_str(json).map_err(|e| format!("Deserialize error: {}", e))?;
    if data.version != 1 {
        return Err(format!("Unknown save version: {}", data.version));
    }
    Ok(data.run_state)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::core::cards::CardDef;

    #[test]
    fn save_load_roundtrip() {
        let run = RunState::new(30, 30, vec![]);
        let json = save_to_string(&run).unwrap();
        let loaded = load_from_string(&json).unwrap();
        assert_eq!(run.gold, loaded.gold);
        assert_eq!(run.hp, loaded.hp);
        assert_eq!(run.max_hp, loaded.max_hp);
    }

    #[test]
    fn save_is_valid_json() {
        let run = RunState::new(30, 30, vec![]);
        let json = save_to_string(&run).unwrap();
        let parsed: serde_json::Value = serde_json::from_str(&json).unwrap();
        assert_eq!(parsed["version"], 1);
        assert!(parsed["run_state"].is_object());
        assert!(parsed["timestamp"].as_u64().unwrap() > 0);
    }

    #[test]
    fn load_rejects_bad_version() {
        let json = r#"{"version":99,"run_state":null,"timestamp":0}"#;
        assert!(load_from_string(json).is_err());
    }

    #[test]
    fn load_rejects_corrupted_json() {
        assert!(load_from_string("not valid json").is_err());
    }
}