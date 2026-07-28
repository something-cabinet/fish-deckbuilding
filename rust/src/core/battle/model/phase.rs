/// Turn phase enumeration.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Phase {
    PlayerTurn,
    EnemyTurn,
    BattleOver,
}
