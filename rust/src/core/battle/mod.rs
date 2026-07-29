pub mod model;
mod service;
pub(crate) mod ai;

pub use model::{BattleResult, BattleState, Phase};
pub use service::{
    end_player_turn, move_unit, player_attack,
    execute_enemy_decision_and_mana, play_enemy_cards_sync, enemy_draw_and_transition,
};
#[allow(unused_imports)]
pub use service::execute_enemy_turn;
pub use ai::Decision;