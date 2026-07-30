use crate::core::cards::{CardDef, Effect, apply_affect_pattern, valid_targets};
use crate::core::constants;
use crate::core::grid::{GridState, movement, Range};
use crate::core::grid::Faction;
use crate::core::battle::model::{BattleState, Phase};

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum Decision {
    Attack { target: (i32, i32) },
    Move { target: (i32, i32), attack_after: Option<(i32, i32)> },
    Wait,
}

pub fn play_enemy_cards(state: &mut BattleState) {
    if state.phase == Phase::BattleOver { return; }
    let Some(enemy_pos) = state.grid.find_faction(Faction::Enemy).first().copied() else { return };
    loop {
        let best = pick_best_enemy_card(state, enemy_pos);
        let Some((idx, card)) = best else { break };
        let target = pick_enemy_card_target(state, enemy_pos, &card);
let Some(target_pos) = target else { break };
            state.enemy_mana -= card.cost;
        state.enemy_hand.remove(idx);
        state.enemy_graveyard.add(card.clone());
        apply_effects(state, &card.effects, target_pos);
        if state.phase == Phase::BattleOver { return; }
    }
}

pub(crate) fn pick_best_enemy_card(state: &BattleState, enemy_pos: (i32, i32)) -> Option<(usize, CardDef)> {
    let hp_pct = |pos| -> f32 {
        state.grid.unit_at(pos).map_or(0.0, |u| u.hp as f32 / u.max_hp as f32)
    };
    let enemy_hp_pct = hp_pct(enemy_pos);

    let mut candidates: Vec<(usize, &CardDef)> = state.enemy_hand.cards.iter().enumerate()
        .filter(|(_, c)| c.cost <= state.enemy_mana)
        .collect();

    if candidates.is_empty() { return None; }

    // Priority: Shield if <50% HP, Heal if <30% HP, highest damage
    let shield_card = candidates.iter().find(|(_, c)| {
        c.effects.iter().any(|e| matches!(e.effect, Effect::Shield(_)))
    });
    if enemy_hp_pct < 0.5 {
        if let Some(&(idx, _)) = shield_card {
            let card = state.enemy_hand.cards[idx].clone();
            return Some((idx, card));
        }
    }

    let heal_card = candidates.iter().find(|(_, c)| {
        c.effects.iter().any(|e| matches!(e.effect, Effect::Heal(_)))
    });
    if enemy_hp_pct < 0.3 {
        if let Some(&(idx, _)) = heal_card {
            let card = state.enemy_hand.cards[idx].clone();
            return Some((idx, card));
        }
    }

    // Highest damage card
    candidates.sort_by(|a, b| {
        let dmg_a = total_damage(&a.1.effects);
        let dmg_b = total_damage(&b.1.effects);
        dmg_b.cmp(&dmg_a)
    });
    let (idx, _) = candidates[0];
    let card = state.enemy_hand.cards[idx].clone();
    Some((idx, card))
}

fn total_damage(effects: &[crate::core::cards::CardEffect]) -> i32 {
    effects.iter().map(|e| match e.effect { Effect::Damage(d) => d, _ => 0 }).sum()
}

pub(crate) fn pick_enemy_card_target(state: &BattleState, enemy_pos: (i32, i32), card: &CardDef) -> Option<(i32, i32)> {
    if let Some(effect) = card.effects.first() {
        match effect.effect {
            Effect::Damage(_) => {
                // Use valid_targets() for proper targeting (P3-B1)
                let targets = valid_targets(effect, enemy_pos, &state.grid, Faction::Enemy);
                if targets.is_empty() { return None; }
                let hero = state.grid.find_faction(Faction::Hero).first().copied();
                // Prefer targeting hero directly if valid
                if let Some(hp) = hero {
                    if targets.contains(&hp) { return Some(hp); }
                }
                // Otherwise pick best AoE target from valid targets
                return find_best_aoe_target_from_targets(state, &targets, &effect.affect_pattern)
                    .or_else(|| targets.first().copied());
            }
            Effect::Shield(_) | Effect::Heal(_) => return Some(enemy_pos),
            Effect::ApplyBuff(_, _) => {
                let hero = state.grid.find_faction(Faction::Hero);
                if hero.is_empty() { return None; }
                return Some(hero[0]);
            }
            Effect::DrawCards(_) => return None,
        }
    }
    None
}

fn find_best_aoe_target_from_targets(state: &BattleState, targets: &[(i32, i32)], affect_pattern: &[(i32, i32)]) -> Option<(i32, i32)> {
    let mut best_count = 0;
    let mut best_tile = None;
    for &tile in targets {
        let affected = apply_affect_pattern(tile, affect_pattern);
        let count = affected.iter().filter(|p| {
            state.grid.unit_at(**p).is_some_and(|u| u.faction == Faction::Hero && u.alive)
        }).count();
        if count > best_count {
            best_count = count;
            best_tile = Some(tile);
        }
    }
    best_tile
}

pub(crate) fn apply_effects(state: &mut BattleState, effects: &[crate::core::cards::CardEffect], target: (i32, i32)) {
    for card_effect in effects {
        let affected = apply_affect_pattern(target, &card_effect.affect_pattern);
        for pos in affected {
            if !state.grid.in_bounds(pos) { continue; }
            match card_effect.effect {
                Effect::Damage(d) => {
                    if let Some(u) = state.grid.unit_at_mut(pos) {
                        u.take_damage(d);
                        if !u.alive { let pos2 = pos; state.grid.remove_unit(pos2); }
                    }
                }
                Effect::Heal(h) => {
                    if let Some(u) = state.grid.unit_at_mut(pos) {
                        u.hp = (u.hp + h).min(u.max_hp);
                    }
                }
                Effect::Shield(s) => {
                    // Shield as temp HP — stored as extra max HP until next turn
                    if let Some(u) = state.grid.unit_at_mut(pos) {
                        let shield = s;
                        u.hp = (u.hp + shield).min(u.max_hp + shield);
                        u.max_hp += shield;
                    }
                }
                Effect::ApplyBuff(_, _) => {
                    // Tracked on GridUnit — for now, no-op stub (buffs deferred to next iteration)
                }
                Effect::DrawCards(n) => {
                    for _ in 0..n { state.draw_enemy_card(); }
                }
            }
        }
    }
    state.check_over();
}

fn chebyshev(a: (i32, i32), b: (i32, i32)) -> i32 { (a.0 - b.0).abs().max((a.1 - b.1).abs()) }

// ----- Phase 4: Multi-unit AI with lethal detection -----

/// Public-facing decision for a single enemy unit.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct AiDecision {
    pub unit_pos: (i32, i32),
    pub action: AiAction,
}

/// Action that an enemy unit can take during its turn.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum AiAction {
    Attack { target: (i32, i32) },
    Move { target: (i32, i32), attack_after: Option<(i32, i32)> },
    Wait,
}

fn can_reach(from: (i32, i32), to: (i32, i32), range: Range) -> bool {
    match range {
        Range::Melee => chebyshev(from, to) == 1,
        Range::Ranged => true,
    }
}

/// Decide action for a specific enemy unit (extracted from `decide()`).
fn decide_for_unit(grid: &GridState, pos: (i32, i32)) -> Decision {
    let hero_positions = grid.find_faction(Faction::Hero);
    if hero_positions.is_empty() { return Decision::Wait; }
    let hero = hero_positions[0];
    let Some(unit) = grid.unit_at(pos) else { return Decision::Wait; };

    // Use unit's range to decide if we can attack (not just adjacency)
    if can_reach(pos, hero, unit.range) { return Decision::Attack { target: hero }; }

    let move_range = movement::get_movement_range(grid, pos, constants::MOVE_BUDGET);
    if move_range.is_empty() { return Decision::Wait; }

    let best = move_range.into_iter().min_by(|a, b| {
        chebyshev(*a, hero).cmp(&chebyshev(*b, hero))
            .then(a.1.cmp(&b.1)).then(a.0.cmp(&b.0))
    }).expect("range is non-empty");

    let attack_after = if can_reach(best, hero, unit.range) { Some(hero) } else { None };
    Decision::Move { target: best, attack_after }
}

/// Produces ordered decisions for ALL enemy units. Returns decisions sorted by
/// priority (highest ATK + HP acts first). Skips exhausted units. Performs
/// lethal detection: any unit that can reach and kill the hero will attack
/// immediately without moving.
pub fn decide_all(state: &BattleState) -> Vec<AiDecision> {
    let grid = &state.grid;
    let enemy_positions = grid.find_faction(Faction::Enemy);

    // Filter non-exhausted units and score by priority (ATK + HP)
    let mut candidates: Vec<((i32, i32), i32)> = enemy_positions.iter()
        .filter_map(|pos| {
            let u = grid.unit_at(*pos)?;
            if u.exhausted() { return None; }
            Some((*pos, u.atk + u.hp))
        })
        .collect();

    // Sort by priority descending
    candidates.sort_by_key(|b| std::cmp::Reverse(b.1));

    // Lethal detection: find a unit that can reach and kill the hero
    let hero_positions = grid.find_faction(Faction::Hero);
    let lethal_attacker = hero_positions.first().and_then(|&hp| {
        let hero = grid.unit_at(hp)?;
        candidates.iter().find(|(pos, _)| {
            grid.unit_at(*pos).is_some_and(|u| {
                can_reach(*pos, hp, u.range) && u.atk >= hero.hp
            })
        }).map(|(pos, _)| *pos)
    });

    // Build decisions
    let mut decisions = Vec::new();
    for &(pos, _) in &candidates {
        if Some(pos) == lethal_attacker {
            // Lethal: attack immediately, don't move
            if let Some(&hp) = hero_positions.first() {
                decisions.push(AiDecision {
                    unit_pos: pos,
                    action: AiAction::Attack { target: hp },
                });
                continue;
            }
        }

        // Normal AI for this unit
        let decision = decide_for_unit(grid, pos);
        let action = match decision {
            Decision::Attack { target } => AiAction::Attack { target },
            Decision::Move { target, attack_after } => AiAction::Move { target, attack_after },
            Decision::Wait => AiAction::Wait,
        };
        decisions.push(AiDecision { unit_pos: pos, action });
    }

    decisions
}

/// Refactored: delegates to `decide_for_unit` for the first enemy unit.
#[allow(dead_code, reason = "Kept for backward compat — tests still exercise it; use decide_all() for multi-unit")]
pub fn decide(state: &GridState) -> Decision {
    let enemy_positions = state.find_faction(Faction::Enemy);
    if enemy_positions.is_empty() { return Decision::Wait; }
    decide_for_unit(state, enemy_positions[0])
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::core::battle::model::BattleState;
    use crate::core::grid::GridUnit;
    use crate::core::battle::{end_player_turn, execute_enemy_turn};

    #[test] fn adjacent_enemy_attacks() { let mut s = BattleState::new(); let hp = s.grid.find_faction(Faction::Hero)[0]; let ep = s.grid.find_faction(Faction::Enemy)[0]; s.grid.remove_unit(hp); s.grid.place_unit((ep.0 - 1, ep.1), GridUnit::hero()); assert_eq!(decide(&s.grid), Decision::Attack { target: (ep.0 - 1, ep.1) }); }
    #[test] fn enemy_moves_toward_hero() { let s = BattleState::new(); let ep = s.grid.find_faction(Faction::Enemy)[0]; let d = decide(&s.grid); match d { Decision::Move { target, .. } => { assert!(chebyshev(target, (0,2)) < chebyshev(ep, (0,2))); } _ => panic!("expected Move"), } }
    #[test] fn deterministic_across_calls() { let s = BattleState::new(); assert_eq!(decide(&s.grid), decide(&s.grid)); }
    #[test] fn returns_wait_when_no_enemies() { let mut g = GridState::new(9,5); g.place_unit((0,0), GridUnit::hero()); assert_eq!(decide(&g), Decision::Wait); }
    #[test] fn attacks_after_move_when_possible() { let mut s = BattleState::new(); let hp = s.grid.find_faction(Faction::Hero)[0]; let ep = s.grid.find_faction(Faction::Enemy)[0]; s.grid.remove_unit(hp); s.grid.place_unit((ep.0 - 2, ep.1), GridUnit::hero()); let d = decide(&s.grid); match d { Decision::Move { target: _, attack_after } => { assert!(attack_after.is_some()); assert_eq!(attack_after, Some((ep.0 - 2, ep.1))); } _ => panic!("expected Move with attack_after"), } }
    #[test] fn tie_break_lowest_y_then_x() { let mut s = BattleState::new(); let hp = s.grid.find_faction(Faction::Hero)[0]; s.grid.remove_unit(hp); s.grid.place_unit((0,2), GridUnit::hero()); let ep = s.grid.find_faction(Faction::Enemy)[0]; s.grid.remove_unit(ep); s.grid.place_unit((2,2), GridUnit::enemy()); let d = decide(&s.grid); match d { Decision::Move { target, .. } => assert_eq!(target, (1,1)), _ => panic!("expected Move"), } }
    #[test] fn enemy_plays_card_during_turn() {
        let mut s = BattleState::new();
        let before_cards = s.enemy_hand.len();
        end_player_turn(&mut s);
        execute_enemy_turn(&mut s);
        assert!(s.enemy_hand.len() <= before_cards);
    }

    // ----- Phase 4: Multi-unit AI with lethal detection -----

    fn multi_unit_battle() -> BattleState {
        let mut s = BattleState::new();
        // Clear default units
        let positions: Vec<_> = s.grid.units.keys().cloned().collect();
        for p in positions { s.grid.remove_unit(p); }
        // Place hero
        s.grid.place_unit((0, 2), GridUnit::hero());
        // Place three enemies at various positions
        s.grid.place_unit((4, 2), GridUnit::new(Faction::Enemy, 10, 2, Range::Melee));
        s.grid.place_unit((6, 1), GridUnit::new(Faction::Enemy, 14, 3, Range::Melee));
        s.grid.place_unit((8, 2), GridUnit::new(Faction::Enemy, 10, 1, Range::Melee));
        s
    }

    #[test]
    fn decide_all_returns_all_enemy_decisions() {
        let state = multi_unit_battle();
        let decisions = decide_all(&state);
        assert_eq!(decisions.len(), 3);
    }

    #[test]
    fn decide_all_sorts_by_priority() {
        let state = multi_unit_battle();
        let decisions = decide_all(&state);
        // Highest ATK+HP should act first: enemy at (6,1) has 14+3=17, highest
        assert_eq!(decisions[0].unit_pos, (6, 1));
    }

    #[test]
    fn decide_all_skips_exhausted_units() {
        let mut state = multi_unit_battle();
        // Exhaust the strongest enemy
        if let Some(u) = state.grid.unit_at_mut((6, 1)) {
            u.attacks_made = u.max_attacks; // exhausted
        }
        let decisions = decide_all(&state);
        // Should only return 2 decisions (the exhausted unit is skipped)
        assert_eq!(decisions.len(), 2);
        // The two remaining should be the other enemies
        let positions: Vec<_> = decisions.iter().map(|d| d.unit_pos).collect();
        assert!(positions.contains(&(4, 2)));
        assert!(positions.contains(&(8, 2)));
    }

    #[test]
    fn lethal_detection_prioritizes_kill() {
        let mut state = BattleState::new();
        // Clear and set up hero with low HP
        let positions: Vec<_> = state.grid.units.keys().cloned().collect();
        for p in positions { state.grid.remove_unit(p); }
        // Hero at (0,2) with 5 HP
        let mut hero = GridUnit::hero();
        hero.hp = 5;
        hero.max_hp = 30;
        state.grid.place_unit((0, 2), hero);
        // Enemy with ATK=8 adjacent → can deal lethal (8 ≥ 5)
        let mut killer = GridUnit::new(Faction::Enemy, 10, 8, Range::Melee);
        killer.moves_made = 1; // has moved
        state.grid.place_unit((1, 2), killer);

        let decisions = decide_all(&state);
        // Should detect lethal and prioritize the kill
        assert!(!decisions.is_empty());
        // The decision for the lethal unit should be Attack
        let killer_decisions: Vec<_> = decisions.iter().filter(|d| d.unit_pos == (1, 2)).collect();
        assert!(!killer_decisions.is_empty());
        // The lethal unit's target should be the hero
        match &killer_decisions[0].action {
            AiAction::Attack { target } => assert_eq!(*target, (0, 2)),
            _ => panic!("Expected Attack action for lethal unit"),
        }
    }

    #[test]
    fn no_lethal_proceeds_normally() {
        let state = multi_unit_battle();
        let decisions = decide_all(&state);
        // Hero has full HP (30), no enemy can deal lethal
        // So all enemies should have normal move/attack decisions
        assert_eq!(decisions.len(), 3);
        for d in &decisions {
            match &d.action {
                AiAction::Attack { target: _ } => {} // fine
                AiAction::Move { target: _, attack_after: _ } => {} // fine
                AiAction::Wait => {} // fine
            }
        }
    }
}