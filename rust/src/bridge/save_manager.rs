use crate::core::overworld::RunState;
use crate::core::save::save_manager;

const SAVE_PATH: &str = "save_0.json";

pub fn save_run_state(run: &RunState) {
    let json = match save_manager::save_to_string(run) {
        Ok(s) => s,
        Err(e) => {
            godot::prelude::godot_error!("Save failed: {}", e);
            return;
        }
    };
    if let Err(e) = std::fs::write(SAVE_PATH, &json) {
        godot::prelude::godot_error!("Save file write failed: {}", e);
    }
}

#[allow(dead_code)]
pub fn load_run_state() -> Option<RunState> {
    let json = match std::fs::read_to_string(SAVE_PATH) {
        Ok(s) => s,
        Err(_) => return None,
    };
    match save_manager::load_from_string(&json) {
        Ok(run) => Some(run),
        Err(e) => {
            godot::prelude::godot_error!("Save load failed: {}", e);
            None
        }
    }
}

#[allow(dead_code)]
pub fn save_exists() -> bool {
    std::path::Path::new(SAVE_PATH).exists()
}