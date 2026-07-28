#[derive(Debug, Clone, PartialEq, Eq)]
pub struct AttackResult {
    pub damage_dealt: i32,
    pub counter_damage: i32,
    pub defender_atk: i32,
}
