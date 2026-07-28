/// Combat domain — attack resolution with pure functions.
pub mod model;
mod service;

// Re-export items consumed by external code (wiki-mem selective barrel pattern)
pub use model::{AttackError, AttackResult};
pub use service::base_attack;
