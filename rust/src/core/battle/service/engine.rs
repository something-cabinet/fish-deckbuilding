use crate::core::battle::model::{BattleState, Phase};
use crate::core::combat;
use crate::core::constants;
use crate::core::grid::{Faction, movement};
use crate::core::battle::ai::{self, Decision};
use crate::core::cards::CardDef;

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
    if unit.has_moved { return Err(EngineError::UnitAlreadyMoved); }
    if unit.faction != Faction::Hero { return Err(EngineError::WrongPhase); }
    if !state.grid.in_bounds(to) || state.grid.unit_at(to).is_some() { return Err(EngineError::MoveFailed); }
    if !movement::get_movement_range(&state.grid, from, constants::MOVE_BUDGET).contains(&to) { return Err(EngineError::MoveFailed); }
    if let Some(u) = state.grid.unit_at_mut(from) { u.has_moved = true; }
    state.grid.move_unit(from, to);
    Ok(())
}

pub fn player_attack(state: &mut BattleState, attacker_pos: (i32, i32), defender_pos: (i32, i32)) -> Result<PlayerAttackResult, EngineError> {
    if state.phase != Phase::PlayerTurn { return Err(EngineError::WrongPhase); }
    let attacker = state.grid.unit_at(attacker_pos).ok_or(EngineError::NoUnitAtPosition)?;
    let defender = state.grid.unit_at(defender_pos).ok_or(EngineError::NoUnitAtPosition)?;
    let combat_result = combat::base_attack(attacker, defender, attacker_pos, defender_pos).map_err(EngineError::AttackFailed)?;
    if let Some(u) = state.grid.unit_at_mut(defender_pos) { u.take_damage(combat_result.damage_dealt); }
    if combat_result.counter_damage > 0 { if let Some(u) = state.grid.unit_at_mut(attacker_pos) { u.take_damage(combat_result.counter_damage); } }
    if let Some(u) = state.grid.unit_at_mut(attacker_pos) { u.has_attacked = true; }
    let defender_dead = state.grid.unit_at(defender_pos).map_or(true, |u| !u.alive);
    let attacker_dead = state.grid.unit_at(attacker_pos).map_or(true, |u| !u.alive);
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
    let decision = ai::decide(&state.grid);
    match decision {
        Decision::Attack { target } => {
            if let Some(&ep) = state.grid.find_faction(Faction::Enemy).first() { resolve_ai_attack(state, ep, target); }
        }
        Decision::Move { target, attack_after } => {
            if let Some(&ep) = state.grid.find_faction(Faction::Enemy).first() {
                state.grid.move_unit(ep, target);
                if let Some(u) = state.grid.unit_at_mut(target) { u.has_moved = true; }
                if let Some(hero_pos) = attack_after { resolve_ai_attack(state, target, hero_pos); }
            }
        }
        Decision::Wait => {}
    }
    ai::play_enemy_cards(state);
    state.draw_enemy_card();
    if state.phase != Phase::BattleOver { start_player_turn(state); }
}

fn resolve_ai_attack(state: &mut BattleState, enemy_pos: (i32, i32), hero_pos: (i32, i32)) -> bool {
    let Some(enemy) = state.grid.unit_at(enemy_pos) else { return false; };
    let Some(hero) = state.grid.unit_at(hero_pos) else { return false; };
    if let Ok(result) = combat::base_attack(enemy, hero, enemy_pos, hero_pos) {
        if let Some(u) = state.grid.unit_at_mut(hero_pos) { u.take_damage(result.damage_dealt); }
        if result.counter_damage > 0 { if let Some(u) = state.grid.unit_at_mut(enemy_pos) { u.take_damage(result.counter_damage); } }
        let hero_dead = state.grid.unit_at(hero_pos).map_or(true, |u| !u.alive);
        let enemy_dead = state.grid.unit_at(enemy_pos).map_or(true, |u| !u.alive);
        if hero_dead { state.grid.remove_unit(hero_pos); }
        if enemy_dead { state.grid.remove_unit(enemy_pos); }
        state.check_over();
        !enemy_dead
    } else { false }
}

/// Executes the mana increment, AI decision, and movement/attack for the enemy turn.
/// Returns the Decision made by the AI.
pub fn execute_enemy_decision_and_mana(state: &mut BattleState) -> Decision {
    if state.phase != Phase::EnemyTurn { return Decision::Wait; }
    state.enemy_mana = state.enemy_mana.min(state.enemy_max_mana - 1) + 1;
    let decision = ai::decide(&state.grid);
    match decision {
        Decision::Attack { target } => {
            if let Some(&ep) = state.grid.find_faction(Faction::Enemy).first() {
                resolve_ai_attack(state, ep, target);
            }
        }
        Decision::Move { target, attack_after } => {
            if let Some(&ep) = state.grid.find_faction(Faction::Enemy).first() {
                state.grid.move_unit(ep, target);
                if let Some(u) = state.grid.unit_at_mut(target) { u.has_moved = true; }
                if let Some(hero_pos) = attack_after {
                    resolve_ai_attack(state, target, hero_pos);
                }
            }
        }
        Decision::Wait => {}
    }
    decision
}

/// Plays all enemy cards synchronously (same as before, one card at a time).
/// Returns the cards that were played.
pub fn play_enemy_cards_sync(state: &mut BattleState) -> Vec<CardDef> {
    ai::play_enemy_cards(state)
}

/// Draws an enemy card and transitions to player turn if not battle over.
pub fn enemy_draw_and_transition(state: &mut BattleState) {
    state.draw_enemy_card();
    if state.phase != Phase::BattleOver { start_player_turn(state); }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::core::battle::model::BattleResult;
    use crate::core::grid::GridUnit;

    #[test] fn start_player_turn_resets_everything() {
        let mut s = BattleState::new(); s.mana = 0;
        let hp = s.grid.find_faction(Faction::Hero)[0]; if let Some(u) = s.grid.unit_at_mut(hp) { u.has_moved = true; u.has_attacked = true; }
        start_player_turn(&mut s);
        assert_eq!(s.phase, Phase::PlayerTurn); assert_eq!(s.turn_number, 2); assert_eq!(s.mana, constants::START_MANA);
        assert!(!s.grid.unit_at(hp).unwrap().has_moved); assert!(!s.grid.unit_at(hp).unwrap().has_attacked);
    }
    #[test] fn move_unit_works_on_player_turn() { let mut s = BattleState::new(); let hp = s.grid.find_faction(Faction::Hero)[0]; assert!(move_unit(&mut s, hp, (1,2)).is_ok()); assert!(s.grid.unit_at((1,2)).unwrap().has_moved); }
    #[test] fn cannot_move_twice() { let mut s = BattleState::new(); let hp = s.grid.find_faction(Faction::Hero)[0]; move_unit(&mut s, hp, (1,2)).unwrap(); assert_eq!(move_unit(&mut s, (1,2), (2,2)), Err(EngineError::UnitAlreadyMoved)); }
    #[test] fn move_to_enemy_tile_fails() { let mut s = BattleState::new(); let hp = s.grid.find_faction(Faction::Hero)[0]; let ep = s.grid.find_faction(Faction::Enemy)[0]; assert_eq!(move_unit(&mut s, hp, ep), Err(EngineError::MoveFailed)); }
    #[test] fn move_off_board_fails() { let mut s = BattleState::new(); let hp = s.grid.find_faction(Faction::Hero)[0]; assert_eq!(move_unit(&mut s, hp, (99, 99)), Err(EngineError::MoveFailed)); }
    #[test] fn move_beyond_budget_fails() { let mut s = BattleState::new(); let hp = s.grid.find_faction(Faction::Hero)[0]; assert_eq!(move_unit(&mut s, hp, (3, 2)), Err(EngineError::MoveFailed)); }
    #[test] fn player_attack_resolves() { let mut s = BattleState::new(); let hp = s.grid.find_faction(Faction::Hero)[0]; s.grid.remove_unit(hp); s.grid.place_unit((4,1), GridUnit::hero()); let r = player_attack(&mut s, (4,1), (5,1)); assert!(r.is_ok()); assert_eq!(r.unwrap().combat_result.damage_dealt, 2); }
    #[test] fn full_turn_cycle() { let mut s = BattleState::new(); assert_eq!(s.phase, Phase::PlayerTurn); end_player_turn(&mut s); assert_eq!(s.phase, Phase::EnemyTurn); let t = s.turn_number; execute_enemy_turn(&mut s); assert_eq!(s.phase, Phase::PlayerTurn); assert_eq!(s.turn_number, t + 1); }
    #[test] fn enemy_turn_moves_and_attacks() {
        let mut s = BattleState::new(); let hp = s.grid.find_faction(Faction::Hero)[0];
        s.grid.remove_unit(hp); s.grid.place_unit((3,1), GridUnit::hero());
        end_player_turn(&mut s); execute_enemy_turn(&mut s);
        let hp2 = s.grid.find_faction(Faction::Hero); assert!(!hp2.is_empty());
        let ep = s.grid.find_faction(Faction::Enemy); assert!(!ep.is_empty());
        let c = (ep[0].0 - hp2[0].0).abs().max((ep[0].1 - hp2[0].1).abs()); assert_eq!(c, 1);
    }
    #[test] fn cannot_attack_wrong_phase() { let mut s = BattleState::new(); end_player_turn(&mut s); assert_eq!(player_attack(&mut s, (0,2), (5,1)), Err(EngineError::WrongPhase)); }
    #[test] fn enemy_turn_triggers_victory() { let mut s = BattleState::new(); let ep = s.grid.find_faction(Faction::Enemy)[0]; s.grid.remove_unit(ep); s.grid.place_unit(ep, GridUnit::new(Faction::Enemy, 1, 0)); let hp = s.grid.find_faction(Faction::Hero)[0]; s.grid.remove_unit(hp); s.grid.place_unit((4,1), GridUnit::hero()); player_attack(&mut s, (4,1), (5,1)).unwrap(); assert_eq!(s.result, Some(BattleResult::Victory)); }
    #[test] fn end_player_turn_draws_card() { let mut s = BattleState::new(); s.hand = crate::core::cards::Hand::new(5); let before = s.hand.len(); end_player_turn(&mut s); assert_eq!(s.hand.len(), before + 1); }
    #[test] fn enemy_turn_draws_card() { let mut s = BattleState::new(); end_player_turn(&mut s); execute_enemy_turn(&mut s); }
}