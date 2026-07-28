pub mod model;
mod service;
mod ai;

pub use model::{BattleResult, BattleState, Phase};
pub use service::{
    end_player_turn, execute_enemy_turn, move_unit, player_attack, start_player_turn, EngineError,
    PlayerAttackResult,
};
