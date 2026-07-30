use crate::core::grid::{GridUnit, Range};
#[cfg(test)]
use crate::core::grid::Faction;
use crate::core::combat::model::{AttackError, AttackResult};

/// Public range check: whether `from` can reach `to` given the unit's range.
pub fn base_attack_validate_range(from: (i32, i32), to: (i32, i32), range: Range) -> Result<(), AttackError> {
    match range {
        Range::Melee => {
            let cheb = (to.0 - from.0).abs().max((to.1 - from.1).abs());
            if cheb == 1 { Ok(()) } else { Err(AttackError::NotAdjacent) }
        }
        Range::Ranged => Ok(()),
    }
}

fn can_reach(from: (i32, i32), to: (i32, i32), range: Range) -> bool {
    match range {
        Range::Melee => {
            let cheb = (to.0 - from.0).abs().max((to.1 - from.1).abs());
            cheb == 1
        }
        Range::Ranged => true,
    }
}

pub fn base_attack(
    attacker: &GridUnit,
    defender: &GridUnit,
    attacker_pos: (i32, i32),
    defender_pos: (i32, i32),
) -> Result<AttackResult, AttackError> {
    validate(attacker, defender, attacker_pos, defender_pos)?;
    let damage_dealt = attacker.atk.min(defender.hp);
    let defender_survives = defender.hp > damage_dealt;
    let (counter_damage, defender_atk) = if defender_survives
        && can_reach(defender_pos, attacker_pos, defender.range)
    {
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
    if !can_reach(attacker_pos, defender_pos, attacker.range) {
        return Err(AttackError::NotAdjacent);
    }
    if attacker.attacks_made >= attacker.max_attacks { return Err(AttackError::AlreadyAttacked); }
    if attacker.faction == defender.faction { return Err(AttackError::SameFaction); }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    fn hero() -> GridUnit { GridUnit::new(Faction::Hero, 30, 2, Range::Melee) }
    fn enemy() -> GridUnit { GridUnit::new(Faction::Enemy, 10, 2, Range::Melee) }
    #[test] fn attack_deals_attacker_atk() { let r = base_attack(&hero(), &enemy(), (0,0),(0,1)).unwrap(); assert_eq!(r.damage_dealt, 2); }
    #[test] fn counterattack_occurs_if_defender_survives() { let r = base_attack(&hero(), &enemy(), (0,0),(0,1)).unwrap(); assert_eq!(r.counter_damage, 2); }
    #[test] fn no_counter_if_attack_kills() { let w = GridUnit::new(Faction::Enemy, 1, 2, Range::Melee); let r = base_attack(&hero(), &w, (0,0),(0,1)).unwrap(); assert_eq!(r.counter_damage, 0); }
    #[test] fn error_not_adjacent() { assert_eq!(base_attack(&hero(), &enemy(), (0,0),(5,3)).unwrap_err(), AttackError::NotAdjacent); }
    #[test] fn error_already_attacked() { let mut a = hero(); a.attacks_made = 1; assert_eq!(base_attack(&a, &enemy(), (0,0),(0,1)).unwrap_err(), AttackError::AlreadyAttacked); }
    #[test] fn error_same_faction() { assert_eq!(base_attack(&hero(), &hero(), (0,0),(0,1)).unwrap_err(), AttackError::SameFaction); }
    #[test] fn damage_clamped_to_hp() { let w = GridUnit::new(Faction::Enemy, 3, 2, Range::Melee); assert_eq!(base_attack(&hero(), &w, (0,0),(0,1)).unwrap().damage_dealt, 2); }
    #[test] fn counterattack_clamped_to_attacker_hp() { let f = GridUnit::new(Faction::Hero, 5, 2, Range::Melee); let t = GridUnit::new(Faction::Enemy, 50, 100, Range::Melee); let r = base_attack(&f, &t, (0,0),(0,1)).unwrap(); assert_eq!(r.counter_damage, 5); }

    // --- Phase 2: Counterattack by Range ---

    #[test]
    fn melee_defender_counterattacks_adjacent() {
        let a = GridUnit::new(Faction::Hero, 30, 2, Range::Ranged);
        let d = GridUnit::new(Faction::Enemy, 10, 2, Range::Melee);
        let r = base_attack(&a, &d, (0,0), (0,1)).unwrap();
        assert_eq!(r.counter_damage, 2);
    }

    #[test]
    fn melee_defender_no_counter_from_distance() {
        let a = GridUnit::new(Faction::Hero, 30, 2, Range::Ranged);
        let d = GridUnit::new(Faction::Enemy, 10, 2, Range::Melee);
        let r = base_attack(&a, &d, (0,0), (3,0)).unwrap();
        assert_eq!(r.counter_damage, 0);
    }

    #[test]
    fn ranged_defender_always_counterattacks() {
        let a = GridUnit::new(Faction::Hero, 30, 2, Range::Ranged);
        let d = GridUnit::new(Faction::Enemy, 10, 2, Range::Ranged);
        let r = base_attack(&a, &d, (0,0), (5,3)).unwrap();
        assert_eq!(r.counter_damage, 2);
    }

    #[test]
    fn ranged_attacker_melee_defender_adjacent_still_counters() {
        let a = GridUnit::new(Faction::Hero, 30, 2, Range::Ranged);
        let d = GridUnit::new(Faction::Enemy, 10, 2, Range::Melee);
        let r = base_attack(&a, &d, (0,0), (1,0)).unwrap();
        assert_eq!(r.counter_damage, 2);
    }

    #[test]
    fn ranged_attacker_can_attack_from_distance() {
        let a = GridUnit::new(Faction::Hero, 30, 2, Range::Ranged);
        let d = GridUnit::new(Faction::Enemy, 10, 2, Range::Melee);
        let result = base_attack(&a, &d, (0,0), (5,2));
        assert!(result.is_ok());
        let r = result.unwrap();
        assert_eq!(r.damage_dealt, 2);
    }

    #[test]
    fn melee_attacker_cannot_attack_from_distance() {
        let a = GridUnit::new(Faction::Hero, 30, 2, Range::Melee);
        let d = GridUnit::new(Faction::Enemy, 10, 2, Range::Melee);
        assert_eq!(base_attack(&a, &d, (0,0), (5,2)).unwrap_err(), AttackError::NotAdjacent);
    }
}
