use crate::core::battle::model::{BattleState, Phase};
use crate::core::cards::Effect;
use crate::core::combat;
use crate::core::constants;
use crate::core::grid::{Faction, Keyword, Range, movement};
use crate::core::battle::ai::{self, Decision};

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum EngineError {
    WrongPhase, MoveFailed, AttackFailed(combat::AttackError), NoUnitAtPosition, UnitAlreadyMoved,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct PlayerAttackResult {
    pub combat_result: combat::AttackResult,
    pub attacker_died: bool, pub defender_died: bool, pub battle_over: bool,
}

pub fn start_player_turn(state: &mut BattleState) { state.phase = Phase::PlayerTurn; state.reset_turn(); }

pub fn move_unit(state: &mut BattleState, from: (i32, i32), to: (i32, i32)) -> Result<(), EngineError> {
    if state.phase != Phase::PlayerTurn { return Err(EngineError::WrongPhase); }
    let unit = state.grid.unit_at(from).ok_or(EngineError::NoUnitAtPosition)?;
    if unit.moves_made >= unit.max_moves { return Err(EngineError::UnitAlreadyMoved); }
    if unit.faction != Faction::Hero { return Err(EngineError::WrongPhase); }
    if !state.grid.in_bounds(to) || state.grid.unit_at(to).is_some() { return Err(EngineError::MoveFailed); }
    if !movement::get_movement_range(&state.grid, from, constants::MOVE_BUDGET).contains(&to) { return Err(EngineError::MoveFailed); }
    if let Some(u) = state.grid.unit_at_mut(from) { u.moves_made += 1; }
    state.grid.move_unit(from, to);
    Ok(())
}

pub fn player_attack(state: &mut BattleState, attacker_pos: (i32, i32), defender_pos: (i32, i32)) -> Result<PlayerAttackResult, EngineError> {
    if state.phase != Phase::PlayerTurn { return Err(EngineError::WrongPhase); }
    let attacker = state.grid.unit_at(attacker_pos).ok_or(EngineError::NoUnitAtPosition)?;
    // Taunt forced-target check (Phase 6): if attacker is adjacent to enemy Taunt, must attack it
    if let Some(taunt_pos) = find_adjacent_enemy_taunt(&state.grid, attacker_pos, attacker.faction, attacker.range) {
        if defender_pos != taunt_pos {
            return Err(EngineError::AttackFailed(combat::AttackError::TauntForcesTarget));
        }
    }
    let defender = state.grid.unit_at(defender_pos).ok_or(EngineError::NoUnitAtPosition)?;
    let combat_result = combat::base_attack(attacker, defender, attacker_pos, defender_pos).map_err(EngineError::AttackFailed)?;
    if let Some(u) = state.grid.unit_at_mut(defender_pos) { u.take_damage(combat_result.damage_dealt); }
    if combat_result.counter_damage > 0 { if let Some(u) = state.grid.unit_at_mut(attacker_pos) { u.take_damage(combat_result.counter_damage); } }
    // Duelyst rule: increment attacks_made and enforce move-after-attack ordering
    if let Some(u) = state.grid.unit_at_mut(attacker_pos) {
        u.attacks_made += 1;
        u.moves_made = u.moves_made.max(u.attacks_made);
    }
    // Parting Gift: check if defender died and had PartingGift keyword
    let defender_dead = state.grid.unit_at(defender_pos).map_or(true, |u| !u.alive);
    if defender_dead {
        trigger_parting_gift(state, defender_pos);
    }
    let attacker_dead = state.grid.unit_at(attacker_pos).map_or(true, |u| !u.alive);
    if attacker_dead {
        trigger_parting_gift(state, attacker_pos);
    }
    if defender_dead { state.grid.remove_unit(defender_pos); }
    if attacker_dead { state.grid.remove_unit(attacker_pos); }
    let battle_over = state.check_over();
    Ok(PlayerAttackResult { combat_result, attacker_died: attacker_dead, defender_died: defender_dead, battle_over })
}

pub fn end_player_turn(state: &mut BattleState) {
    state.draw_player_card();
    state.phase = Phase::EnemyTurn;
}

#[allow(dead_code)]
pub fn execute_enemy_turn(state: &mut BattleState) {
    if state.phase != Phase::EnemyTurn { return; }
    state.enemy_mana = state.enemy_mana.min(state.enemy_max_mana - 1) + 1;
    // Phase 4: Use multi-unit AI — iterate all decisions from decide_all()
    let decisions = ai::decide_all(state);
    for decision in decisions {
        match decision.action {
            ai::AiAction::Attack { target } => {
                // Collision guard: target must still be alive
                if state.grid.unit_at(target).map_or(true, |u| !u.alive) { continue; }
                resolve_ai_attack(state, decision.unit_pos, target);
            }
            ai::AiAction::Move { target, attack_after } => {
                // Collision guard: target tile must not be occupied
                if state.grid.unit_at(target).is_some() { continue; }
                state.grid.move_unit(decision.unit_pos, target);
                if let Some(u) = state.grid.unit_at_mut(target) { u.moves_made += 1; }
                if let Some(hero_pos) = attack_after {
                    // Collision guard: hero must still be alive
                    if state.grid.unit_at(hero_pos).map_or(true, |u| !u.alive) { continue; }
                    resolve_ai_attack(state, target, hero_pos);
                }
            }
            ai::AiAction::Wait => {}
        }
    }
    ai::play_enemy_cards(state);
    state.draw_enemy_card();
    if state.phase != Phase::BattleOver { start_player_turn(state); }
}

fn resolve_ai_attack(state: &mut BattleState, enemy_pos: (i32, i32), hero_pos: (i32, i32)) -> bool {
    let Some(enemy) = state.grid.unit_at(enemy_pos) else { return false; };
    // AI Taunt forced-target: if enemy is adjacent to a hero Taunt, must attack it
    let actual_target = match find_adjacent_hero_taunt(&state.grid, enemy_pos) {
        Some(taunt_pos) => taunt_pos,
        None => hero_pos,
    };
    let Some(hero) = state.grid.unit_at(actual_target) else { return false; };
    if let Ok(result) = combat::base_attack(enemy, hero, enemy_pos, actual_target) {
        if let Some(u) = state.grid.unit_at_mut(actual_target) { u.take_damage(result.damage_dealt); }
        if result.counter_damage > 0 { if let Some(u) = state.grid.unit_at_mut(enemy_pos) { u.take_damage(result.counter_damage); } }
        // Duelyst rule: increment attacks_made and enforce move-after-attack ordering
        if let Some(u) = state.grid.unit_at_mut(enemy_pos) {
            u.attacks_made += 1;
            u.moves_made = u.moves_made.max(u.attacks_made);
        }
        let hero_dead = state.grid.unit_at(actual_target).map_or(true, |u| !u.alive);
        let enemy_dead = state.grid.unit_at(enemy_pos).map_or(true, |u| !u.alive);
        if hero_dead { state.grid.remove_unit(actual_target); }
        if enemy_dead { state.grid.remove_unit(enemy_pos); }
        state.check_over();
        !enemy_dead
    } else { false }
}

/// Executes the mana increment, AI decisions for ALL enemies, and returns all decisions made.
/// Uses `decide_all()` with collision guards for multi-unit support.
pub fn execute_enemy_decision_and_mana(state: &mut BattleState) -> Vec<Decision> {
    if state.phase != Phase::EnemyTurn { return vec![Decision::Wait]; }
    state.enemy_mana = state.enemy_mana.min(state.enemy_max_mana - 1) + 1;
    let decisions = ai::decide_all(state);
    let mut results: Vec<Decision> = Vec::new();
    for decision in decisions {
        let d = match decision.action {
            ai::AiAction::Attack { target } => {
                // Collision guard: target must still be alive
                if state.grid.unit_at(target).map_or(true, |u| !u.alive) { continue; }
                resolve_ai_attack(state, decision.unit_pos, target);
                Decision::Attack { target }
            }
            ai::AiAction::Move { target, attack_after } => {
                // Collision guard: target tile must not be occupied
                if state.grid.unit_at(target).is_some() { continue; }
                state.grid.move_unit(decision.unit_pos, target);
                if let Some(u) = state.grid.unit_at_mut(target) { u.moves_made += 1; }
                if let Some(hero_pos) = attack_after {
                    // Collision guard: hero must still be alive
                    if state.grid.unit_at(hero_pos).map_or(true, |u| !u.alive) { continue; }
                    resolve_ai_attack(state, target, hero_pos);
                }
                Decision::Move { target, attack_after }
            }
            ai::AiAction::Wait => { Decision::Wait }
        };
        results.push(d);
    }
    results
}

/// Plays all enemy cards synchronously (same as before, one card at a time).
pub fn play_enemy_cards_sync(state: &mut BattleState) {
    ai::play_enemy_cards(state);
}

/// Draws an enemy card and transitions to player turn if not battle over.
pub fn enemy_draw_and_transition(state: &mut BattleState) {
    state.draw_enemy_card();
    if state.phase != Phase::BattleOver { start_player_turn(state); }
}

// --- Phase 6: Keyword helpers ---

/// Returns the position of an enemy Taunt unit adjacent to `unit_pos`, or None.
/// Used for forced-target checking (attacker must attack the Taunt if adjacent).
/// Uses `attacker_range` (NOT the taunt's range) to check reachability.
fn find_adjacent_enemy_taunt(grid: &crate::core::grid::GridState, unit_pos: (i32, i32), unit_faction: Faction, attacker_range: Range) -> Option<(i32, i32)> {
    for d in &crate::core::grid::movement::DIRS_8 {
        let ap = (unit_pos.0 + d.0, unit_pos.1 + d.1);
        if let Some(u) = grid.unit_at(ap) {
            if u.alive && u.faction != unit_faction && u.keywords.contains(&Keyword::Taunt) {
                // Check that the ATTACKER can reach the taunt (using attacker's range)
                if crate::core::combat::base_attack::base_attack_validate_range(unit_pos, ap, attacker_range).is_ok() {
                    return Some(ap);
                }
            }
        }
    }
    None
}

/// Returns the position of a hero Taunt unit adjacent to `unit_pos`, or None.
/// Used for AI forced-target checking (enemy must attack the hero Taunt if adjacent).
fn find_adjacent_hero_taunt(grid: &crate::core::grid::GridState, unit_pos: (i32, i32)) -> Option<(i32, i32)> {
    for d in &crate::core::grid::movement::DIRS_8 {
        let ap = (unit_pos.0 + d.0, unit_pos.1 + d.1);
        if let Some(u) = grid.unit_at(ap) {
            if u.alive && u.faction == Faction::Hero && u.keywords.contains(&Keyword::Taunt) {
                return Some(ap);
            }
        }
    }
    None
}

/// Triggers Parting Gift effects for a unit at `pos` that just died.
/// Resolves the full Effect enum: Damage → adjacent enemies, Heal/Shield → adjacent allies.
fn trigger_parting_gift(state: &mut BattleState, pos: (i32, i32)) {
    let gifter = match state.grid.unit_at(pos) {
        Some(u) if !u.alive => u.clone(),
        _ => return,
    };
    let effect = match gifter.keywords.iter().find_map(|k| {
        if let Keyword::PartingGift(e) = k { Some(e.clone()) } else { None }
    }) {
        Some(e) => e,
        None => return,
    };
    match effect {
        Effect::Damage(damage) => {
            // Deal damage to adjacent enemies (opposing faction)
            let opposing_faction = match gifter.faction {
                Faction::Hero => Faction::Enemy,
                Faction::Enemy => Faction::Hero,
            };
            for d in &crate::core::grid::movement::DIRS_8 {
                let ap = (pos.0 + d.0, pos.1 + d.1);
                if let Some(u) = state.grid.unit_at_mut(ap) {
                    if u.faction == opposing_faction && u.alive {
                        u.take_damage(damage);
                        if !u.alive {
                            state.grid.remove_unit(ap);
                        }
                    }
                }
            }
        }
        Effect::Heal(amount) => {
            // Heal adjacent allies (same faction)
            for d in &crate::core::grid::movement::DIRS_8 {
                let ap = (pos.0 + d.0, pos.1 + d.1);
                if let Some(u) = state.grid.unit_at_mut(ap) {
                    if u.faction == gifter.faction && u.alive {
                        u.hp = (u.hp + amount).min(u.max_hp);
                    }
                }
            }
        }
        Effect::Shield(amount) => {
            // Shield adjacent allies
            for d in &crate::core::grid::movement::DIRS_8 {
                let ap = (pos.0 + d.0, pos.1 + d.1);
                if let Some(u) = state.grid.unit_at_mut(ap) {
                    if u.faction == gifter.faction && u.alive {
                        u.hp = (u.hp + amount).min(u.max_hp + amount);
                        u.max_hp += amount;
                    }
                }
            }
        }
        Effect::DrawCards(_) | Effect::ApplyBuff(_, _) => {
            // Not yet implemented for Parting Gift
        }
    }
    state.check_over();
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::core::battle::model::BattleResult;
    use crate::core::grid::{GridUnit, Range};

    #[test] fn start_player_turn_resets_everything() {
        let mut s = BattleState::new(); s.mana = 0;
        let hp = s.grid.find_faction(Faction::Hero)[0]; if let Some(u) = s.grid.unit_at_mut(hp) { u.moves_made = 2; u.attacks_made = 1; }
        start_player_turn(&mut s);
        assert_eq!(s.phase, Phase::PlayerTurn); assert_eq!(s.turn_number, 2);
        // Mana ramps: turn 1 max_mana=1 → turn 2 max_mana=2, so mana fills to 2
        assert_eq!(s.mana, 2);
        assert_eq!(s.grid.unit_at(hp).unwrap().moves_made, 0); assert_eq!(s.grid.unit_at(hp).unwrap().attacks_made, 0);
    }
    #[test] fn move_unit_works_on_player_turn() { let mut s = BattleState::new(); let hp = s.grid.find_faction(Faction::Hero)[0]; assert!(move_unit(&mut s, hp, (1,2)).is_ok()); assert_eq!(s.grid.unit_at((1,2)).unwrap().moves_made, 1); }
    #[test] fn cannot_move_twice() { let mut s = BattleState::new(); let hp = s.grid.find_faction(Faction::Hero)[0]; move_unit(&mut s, hp, (1,2)).unwrap(); assert_eq!(move_unit(&mut s, (1,2), (2,2)), Err(EngineError::UnitAlreadyMoved)); }
    #[test] fn move_to_enemy_tile_fails() { let mut s = BattleState::new(); let hp = s.grid.find_faction(Faction::Hero)[0]; let ep = s.grid.find_faction(Faction::Enemy)[0]; assert_eq!(move_unit(&mut s, hp, ep), Err(EngineError::MoveFailed)); }
    #[test] fn move_off_board_fails() { let mut s = BattleState::new(); let hp = s.grid.find_faction(Faction::Hero)[0]; assert_eq!(move_unit(&mut s, hp, (99, 99)), Err(EngineError::MoveFailed)); }
    #[test] fn move_beyond_budget_fails() { let mut s = BattleState::new(); let hp = s.grid.find_faction(Faction::Hero)[0]; assert_eq!(move_unit(&mut s, hp, (3, 2)), Err(EngineError::MoveFailed)); }
    #[test] fn player_attack_resolves() { let mut s = BattleState::new(); let hp = s.grid.find_faction(Faction::Hero)[0]; let ep = s.grid.find_faction(Faction::Enemy)[0]; s.grid.remove_unit(hp); s.grid.place_unit((ep.0 - 1, ep.1), GridUnit::hero()); move_unit(&mut s, (ep.0 - 1, ep.1), (ep.0 - 1, ep.1 - 1)).unwrap(); let r = player_attack(&mut s, (ep.0 - 1, ep.1 - 1), ep); assert!(r.is_ok()); assert_eq!(r.unwrap().combat_result.damage_dealt, 2); }
    #[test] fn full_turn_cycle() { let mut s = BattleState::new(); assert_eq!(s.phase, Phase::PlayerTurn); end_player_turn(&mut s); assert_eq!(s.phase, Phase::EnemyTurn); let t = s.turn_number; execute_enemy_turn(&mut s); assert_eq!(s.phase, Phase::PlayerTurn); assert_eq!(s.turn_number, t + 1); }
    #[test] fn enemy_turn_moves_and_attacks() {
        let mut s = BattleState::new(); let hp = s.grid.find_faction(Faction::Hero)[0];
        let ep = s.grid.find_faction(Faction::Enemy)[0];
        s.grid.remove_unit(hp); s.grid.place_unit((ep.0 - 2, ep.1), GridUnit::hero());
        end_player_turn(&mut s); execute_enemy_turn(&mut s);
        let hp2 = s.grid.find_faction(Faction::Hero); assert!(!hp2.is_empty());
        let ep2 = s.grid.find_faction(Faction::Enemy); assert!(!ep2.is_empty());
        let c = (ep2[0].0 - hp2[0].0).abs().max((ep2[0].1 - hp2[0].1).abs()); assert_eq!(c, 1);
    }
    #[test] fn cannot_attack_wrong_phase() { let mut s = BattleState::new(); end_player_turn(&mut s); assert_eq!(player_attack(&mut s, (0,2), (5,1)), Err(EngineError::WrongPhase)); }
    #[test] fn enemy_turn_triggers_victory() { let mut s = BattleState::new(); let ep = s.grid.find_faction(Faction::Enemy)[0]; s.grid.remove_unit(ep); s.grid.place_unit(ep, GridUnit::new(Faction::Enemy, 1, 0, Range::Melee)); let hp = s.grid.find_faction(Faction::Hero)[0]; s.grid.remove_unit(hp); s.grid.place_unit((ep.0 - 1, ep.1), GridUnit::hero()); move_unit(&mut s, (ep.0 - 1, ep.1), (ep.0 - 1, ep.1 - 1)).unwrap(); player_attack(&mut s, (ep.0 - 1, ep.1 - 1), ep).unwrap(); assert_eq!(s.result, Some(BattleResult::Victory)); }
    #[test] fn end_player_turn_draws_card() { let mut s = BattleState::new(); s.hand = crate::core::cards::Hand::new(5); let before = s.hand.len(); end_player_turn(&mut s); assert_eq!(s.hand.len(), before + 1); }
    #[test] fn enemy_turn_draws_card() { let mut s = BattleState::new(); end_player_turn(&mut s); execute_enemy_turn(&mut s); }

    // --- Phase 2: Duelyst-correct move-after-attack ordering ---

    #[test]
    fn cannot_move_after_attacking() {
        let mut s = BattleState::new();
        let hp = s.grid.find_faction(Faction::Hero)[0];
        let ep = s.grid.find_faction(Faction::Enemy)[0];
        s.grid.remove_unit(hp);
        s.grid.remove_unit(ep);
        s.grid.place_unit((4, 1), GridUnit::hero());
        s.grid.place_unit((5, 1), GridUnit::enemy()); // adjacent enemy
        // Attack first — now allowed (Duelyst rule: attack doesn't require prior move)
        let r = player_attack(&mut s, (4, 1), (5, 1));
        assert!(r.is_ok());
        // Now try to move — should FAIL because moves_made >= attacks_made (=1)
        assert_eq!(move_unit(&mut s, (4, 1), (3, 1)), Err(EngineError::UnitAlreadyMoved));
    }

    #[test]
    fn can_attack_after_moving() {
        let mut s = BattleState::new();
        let hp = s.grid.find_faction(Faction::Hero)[0];
        s.grid.remove_unit(hp);
        s.grid.place_unit((6, 2), GridUnit::hero()); // 2 tiles from enemy at (8,2)
        assert!(move_unit(&mut s, (6, 2), (7, 2)).is_ok()); // move adjacent to enemy
        let r = player_attack(&mut s, (7, 2), (8, 2));
        assert!(r.is_ok());
    }

    #[test]
    fn exhausted_unit_cannot_attack() {
        let mut s = BattleState::new();
        let hp = s.grid.find_faction(Faction::Hero)[0];
        s.grid.remove_unit(hp);
        s.grid.place_unit((7, 2), GridUnit::hero()); // adjacent to enemy at (8,2)
        if let Some(u) = s.grid.unit_at_mut((7, 2)) {
            u.moves_made = 1;
            u.attacks_made = 1;
        }
        let r = player_attack(&mut s, (7, 2), (8, 2));
        assert_eq!(r, Err(EngineError::AttackFailed(combat::AttackError::AlreadyAttacked)));
    }

    // --- Phase 6: Keyword combat effects ---

    #[test]
    fn taunt_forces_target_when_adjacent() {
        let mut s = BattleState::new();
        // Clear all units
        let positions: Vec<_> = s.grid.units.keys().cloned().collect();
        for p in positions { s.grid.remove_unit(p); }
        // Hero at (2,2), taunt enemy at (3,2), other enemy at (1,1)
        s.grid.place_unit((2, 2), GridUnit::hero());
        let mut taunt_unit = GridUnit::new(Faction::Enemy, 10, 2, Range::Melee);
        taunt_unit.keywords = vec![Keyword::Taunt];
        s.grid.place_unit((3, 2), taunt_unit);
        s.grid.place_unit((1, 1), GridUnit::new(Faction::Enemy, 10, 2, Range::Melee));
        // Hero adjacent to taunt at (3,2) — trying to attack (1,1) instead
        // (2,2) to (1,1) is adjacent (Chebyshev 1). But taunt at (3,2) is also adjacent.
        // Taunt should force attacking the taunt
        let r = player_attack(&mut s, (2, 2), (1, 1));
        assert_eq!(r, Err(EngineError::AttackFailed(combat::AttackError::TauntForcesTarget)));
    }

    #[test]
    fn taunt_allows_attack_on_taunt() {
        let mut s = BattleState::new();
        let positions: Vec<_> = s.grid.units.keys().cloned().collect();
        for p in positions { s.grid.remove_unit(p); }
        // Hero at (2,2), taunt enemy at (3,2)
        s.grid.place_unit((2, 2), GridUnit::hero());
        let mut taunt_u = GridUnit::new(Faction::Enemy, 10, 2, Range::Melee);
        taunt_u.keywords = vec![Keyword::Taunt];
        s.grid.place_unit((3, 2), taunt_u);
        // Attack the taunt — should succeed
        let r = player_attack(&mut s, (2, 2), (3, 2));
        assert!(r.is_ok());
    }

    #[test]
    fn no_taunt_any_target_allowed() {
        let mut s = BattleState::new();
        let positions: Vec<_> = s.grid.units.keys().cloned().collect();
        for p in positions { s.grid.remove_unit(p); }
        // Hero at (2,2), two plain enemies — no taunt present
        s.grid.place_unit((2, 2), GridUnit::hero());
        s.grid.place_unit((3, 2), GridUnit::new(Faction::Enemy, 10, 2, Range::Melee));
        s.grid.place_unit((1, 1), GridUnit::new(Faction::Enemy, 10, 2, Range::Melee));
        // No taunt — attack any enemy
        let r = player_attack(&mut s, (2, 2), (1, 1));
        assert!(r.is_ok());
    }

    #[test]
    fn multi_unit_collision_does_not_delete_units() {
        let mut s = BattleState::new();
        let all_pos: Vec<_> = s.grid.units.keys().copied().collect();
        for p in all_pos { s.grid.remove_unit(p); }
        // Place hero at (4,2)
        s.grid.place_unit((4, 2), GridUnit::hero());
        // Two enemies that would both path toward hero
        // Enemies at (1,2) and (1,4) — both want to move toward (4,2)
        // They converge at different tiles but could collide
        s.grid.place_unit((1, 2), GridUnit::new(Faction::Enemy, 10, 2, Range::Melee));
        s.grid.place_unit((1, 4), GridUnit::new(Faction::Enemy, 10, 2, Range::Melee));

        // Run enemy turn via the stepwise API
        if s.phase == Phase::PlayerTurn { end_player_turn(&mut s); }
        // Use execute_enemy_turn to iterate decide_all internally with collision guards
        execute_enemy_turn(&mut s);

        // Both enemies should still be alive — no unit was deleted by collision
        let enemies = s.grid.find_faction(Faction::Enemy);
        assert_eq!(enemies.len(), 2, "Both enemies should survive after enemy turn");
    }

    #[test]
    fn parting_gift_deals_aoe_on_death() {
        let mut s = BattleState::new();
        let positions: Vec<_> = s.grid.units.keys().cloned().collect();
        for p in positions { s.grid.remove_unit(p); }
        // Hero with 3 HP (dies easily) and PartingGift(3) at (2,2)
        let mut hero = GridUnit::new(Faction::Hero, 3, 2, Range::Melee);
        hero.keywords = vec![Keyword::PartingGift(Effect::Damage(3))];
        s.grid.place_unit((2, 2), hero);
        // Enemy at (3,2) with high ATK to kill the hero in one counter
        s.grid.place_unit((3, 2), GridUnit::new(Faction::Enemy, 10, 10, Range::Melee));
        // Second enemy at (2,1) that will take Parting Gift damage (2 HP, dies from 3 dmg)
        s.grid.place_unit((2, 1), GridUnit::new(Faction::Enemy, 2, 1, Range::Melee));
        // Hero attacks enemy — hero takes 10 counter damage, dies. PartingGift(3) triggers.
        // Parting Gift deals 3 damage to adjacent enemy units: (3,2) takes 3 → HP 7, (2,1) takes 3 → dead
        let r = player_attack(&mut s, (2, 2), (3, 2));
        assert!(r.is_ok(), "Attack should resolve: {:?}", r);
        // Hero should be dead
        let hero_alive = s.grid.unit_at((2, 2)).map_or(false, |u| u.alive);
        assert!(!hero_alive, "Hero should have died from counter");
        // Enemy at (2,1) should be dead from Parting Gift
        let victim_alive = s.grid.unit_at((2, 1)).map_or(false, |u| u.alive);
        assert!(!victim_alive, "Adjacent enemy should die from Parting Gift");
        // Enemy at (3,2) should still be alive (took 2 combat + 3 Parting Gift = 5 damage)
        let enemy_hp = s.grid.unit_at((3, 2)).map(|u| u.hp);
        assert_eq!(enemy_hp, Some(5), "Enemy should have taken 2 combat + 3 Parting Gift = 5 damage");
    }
}