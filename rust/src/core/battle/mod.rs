/// Battle domain — turn orchestration, state machine, enemy AI.
pub mod model;
mod service;
mod ai;

// Re-export items consumed by external code (wiki-mem selective barrel pattern)
pub use model::{BattleResult, BattleState, Phase};
pub use service::{
    end_player_turn, execute_enemy_turn, move_unit, player_attack, start_player_turn, EngineError,
    PlayerAttackResult,
};
