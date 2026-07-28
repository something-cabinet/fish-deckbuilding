/// Grid domain — units, grid state, BFS movement.
pub mod model;
mod service;

// Re-export items consumed by external code (wiki-mem selective barrel pattern)
pub use model::{Faction, GridState, GridUnit};

// Re-export movement module for consumers using grid::movement::*
pub(crate) use service::movement;
