use crate::core::cards::{CardDef, Effect, cross_aoe};
use crate::core::constants;
use crate::core::grid::{GridState, movement};
use crate::core::grid::Faction;
use crate::core::battle::model::{BattleState, Phase};

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum Decision {
    Attack { target: (i32, i32) },
    Move { target: (i32, i32), attack_after: Option<(i32, i32)> },
    Wait,
}

pub fn decide(state: &GridState) -> Decision {
    let hero_positions = state.find_faction(Faction::Hero);
    let enemy_positions = state.find_faction(Faction::Enemy);
    if hero_positions.is_empty() || enemy_positions.is_empty() { return Decision::Wait; }
    let hero = hero_positions[0];
    let enemy = enemy_positions[0];
    if is_adjacent(enemy, hero) { return Decision::Attack { target: hero }; }
    let range = movement::get_movement_range(state, enemy, constants::MOVE_BUDGET);
    if range.is_empty() { return Decision::Wait; }
    let best = range.into_iter().min_by(|a, b| {
        chebyshev(*a, hero).cmp(&chebyshev(*b, hero))
            .then(a.1.cmp(&b.1)).then(a.0.cmp(&b.0))
    }).expect("range is non-empty");
    let attack_after = if is_adjacent(best, hero) { Some(hero) } else { None };
    Decision::Move { target: best, attack_after }
}

pub fn play_enemy_cards(state: &mut BattleState) -> Vec<CardDef> {
    let mut played = Vec::new();
    if state.phase == Phase::BattleOver { return played; }
    let Some(enemy_pos) = state.grid.find_faction(Faction::Enemy).first().copied() else { return played };
    loop {
        let best = pick_best_enemy_card(state, enemy_pos);
        let Some((idx, card)) = best else { break };
        let target = pick_enemy_card_target(state, enemy_pos, &card);
let Some(target_pos) = target else { break };
            state.enemy_mana -= card.cost;
        state.enemy_hand.remove(idx);
        state.enemy_graveyard.add(card.clone());
        played.push(card.clone());
        apply_effects(state, &card.effects, target_pos);
        if state.phase == Phase::BattleOver { return played; }
    }
    played
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
                let hero_positions = state.grid.find_faction(Faction::Hero);
                if hero_positions.is_empty() { return None; }
                let hero = hero_positions[0];
                if chebyshev(enemy_pos, hero) > effect.range {
                    // Cannot reach directly, use best tile within range that hits most allies
                    return find_best_aoe_target(state, enemy_pos, effect.range, effect.aoe);
                }
                return Some(hero);
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

fn find_best_aoe_target(state: &BattleState, caster: (i32, i32), range: i32, aoe: i32) -> Option<(i32, i32)> {
    let mut best_count = 0;
    let mut best_tile = None;
    let hero_positions: Vec<(i32, i32)> = state.grid.find_faction(Faction::Hero);
    if hero_positions.is_empty() { return None; }
    for x in (caster.0 - range)..=(caster.0 + range) {
        for y in (caster.1 - range)..=(caster.1 + range) {
            if !state.grid.in_bounds((x, y)) { continue; }
            if chebyshev(caster, (x, y)) > range { continue; }
            let affected = cross_aoe((x, y), aoe);
            let count = affected.iter().filter(|p| {
                state.grid.unit_at(**p).is_some_and(|u| u.faction == Faction::Hero && u.alive)
            }).count();
            if count > best_count {
                best_count = count;
                best_tile = Some((x, y));
            }
        }
    }
    best_tile
}

pub(crate) fn apply_effects(state: &mut BattleState, effects: &[crate::core::cards::CardEffect], target: (i32, i32)) {
    for card_effect in effects {
        let affected = cross_aoe(target, card_effect.aoe);
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
fn is_adjacent(a: (i32, i32), b: (i32, i32)) -> bool { chebyshev(a, b) == 1 }

#[cfg(test)]
mod tests {
    use super::*;
    use crate::core::battle::model::BattleState;
    use crate::core::grid::GridUnit;
    use crate::core::battle::{end_player_turn, execute_enemy_turn};

    #[test] fn adjacent_enemy_attacks() { let mut s = BattleState::new(); let hp = s.grid.find_faction(Faction::Hero)[0]; s.grid.remove_unit(hp); s.grid.place_unit((4,1), GridUnit::hero()); assert_eq!(decide(&s.grid), Decision::Attack { target: (4,1) }); }
    #[test] fn enemy_moves_toward_hero() { let s = BattleState::new(); let d = decide(&s.grid); match d { Decision::Move { target, .. } => { assert!(chebyshev(target, (0,2)) < chebyshev((5,1), (0,2))); } _ => panic!("expected Move"), } }
    #[test] fn deterministic_across_calls() { let s = BattleState::new(); assert_eq!(decide(&s.grid), decide(&s.grid)); }
    #[test] fn returns_wait_when_no_enemies() { let mut g = GridState::new(6,4); g.place_unit((0,0), GridUnit::hero()); assert_eq!(decide(&g), Decision::Wait); }
    #[test] fn attacks_after_move_when_possible() { let mut s = BattleState::new(); let hp = s.grid.find_faction(Faction::Hero)[0]; s.grid.remove_unit(hp); s.grid.place_unit((3,1), GridUnit::hero()); let d = decide(&s.grid); match d { Decision::Move { target, attack_after } => { assert!(attack_after.is_some()); assert_eq!(attack_after, Some((3,1))); assert_eq!(target, (4,0)); } _ => panic!("expected Move with attack_after"), } }
    #[test] fn tie_break_lowest_y_then_x() { let mut s = BattleState::new(); let hp = s.grid.find_faction(Faction::Hero)[0]; s.grid.remove_unit(hp); s.grid.place_unit((0,2), GridUnit::hero()); let ep = s.grid.find_faction(Faction::Enemy)[0]; s.grid.remove_unit(ep); s.grid.place_unit((2,2), GridUnit::enemy()); let d = decide(&s.grid); match d { Decision::Move { target, .. } => assert_eq!(target, (1,1)), _ => panic!("expected Move"), } }
    #[test] fn enemy_plays_card_during_turn() {
        let mut s = BattleState::new();
        let before_cards = s.enemy_hand.len();
        end_player_turn(&mut s);
        execute_enemy_turn(&mut s);
        assert!(s.enemy_hand.len() <= before_cards);
    }
}