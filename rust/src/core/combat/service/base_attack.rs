use crate::core::grid::GridUnit;
#[cfg(test)]
use crate::core::grid::Faction;
use crate::core::combat::model::{AttackError, AttackResult};

pub fn base_attack(
    attacker: &GridUnit,
    defender: &GridUnit,
    attacker_pos: (i32, i32),
    defender_pos: (i32, i32),
) -> Result<AttackResult, AttackError> {
    validate(attacker, defender, attacker_pos, defender_pos)?;
    let damage_dealt = attacker.atk.min(defender.hp);
    let defender_survives = defender.hp > damage_dealt;
    let (counter_damage, defender_atk) = if defender_survives {
        (defender.atk.min(attacker.hp), defender.atk)
    } else {
        (0, 0)
    };
    Ok(AttackResult { damage_dealt, counter_damage, defender_atk })
}

fn validate(
    attacker: &GridUnit, defender: &GridUnit,
    attacker_pos: (i32, i32), defender_pos: (i32, i32),
) -> Result<(), AttackError> {
    if !attacker.alive { return Err(AttackError::NoAttacker); }
    if !defender.alive { return Err(AttackError::NoDefender); }
    let cheb = (defender_pos.0 - attacker_pos.0).abs().max((defender_pos.1 - attacker_pos.1).abs());
    if cheb != 1 { return Err(AttackError::NotAdjacent); }
    if attacker.has_attacked { return Err(AttackError::AlreadyAttacked); }
    if attacker.faction == defender.faction { return Err(AttackError::SameFaction); }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    fn hero() -> GridUnit { GridUnit::new(Faction::Hero, 30, 2) }
    fn enemy() -> GridUnit { GridUnit::new(Faction::Enemy, 10, 2) }
    #[test] fn attack_deals_attacker_atk() { let r = base_attack(&hero(), &enemy(), (0,0),(0,1)).unwrap(); assert_eq!(r.damage_dealt, 2); }
    #[test] fn counterattack_occurs_if_defender_survives() { let r = base_attack(&hero(), &enemy(), (0,0),(0,1)).unwrap(); assert_eq!(r.counter_damage, 2); }
    #[test] fn no_counter_if_attack_kills() { let w = GridUnit::new(Faction::Enemy, 1, 2); let r = base_attack(&hero(), &w, (0,0),(0,1)).unwrap(); assert_eq!(r.counter_damage, 0); }
    #[test] fn error_not_adjacent() { assert_eq!(base_attack(&hero(), &enemy(), (0,0),(5,3)).unwrap_err(), AttackError::NotAdjacent); }
    #[test] fn error_already_attacked() { let mut a = hero(); a.has_attacked = true; assert_eq!(base_attack(&a, &enemy(), (0,0),(0,1)).unwrap_err(), AttackError::AlreadyAttacked); }
    #[test] fn error_same_faction() { assert_eq!(base_attack(&hero(), &hero(), (0,0),(0,1)).unwrap_err(), AttackError::SameFaction); }
    #[test] fn damage_clamped_to_hp() { let w = GridUnit::new(Faction::Enemy, 3, 2); assert_eq!(base_attack(&hero(), &w, (0,0),(0,1)).unwrap().damage_dealt, 2); }
    #[test] fn counterattack_clamped_to_attacker_hp() { let f = GridUnit::new(Faction::Hero, 5, 2); let t = GridUnit::new(Faction::Enemy, 50, 100); let r = base_attack(&f, &t, (0,0),(0,1)).unwrap(); assert_eq!(r.counter_damage, 5); }
}
