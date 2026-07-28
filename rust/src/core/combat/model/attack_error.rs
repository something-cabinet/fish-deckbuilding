#[derive(Debug, Clone, PartialEq, Eq)]
pub enum AttackError {
    NoAttacker,
    NoDefender,
    NotAdjacent,
    AlreadyAttacked,
    SameFaction,
}
