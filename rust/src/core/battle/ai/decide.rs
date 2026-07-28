use crate::core::constants;
use crate::core::grid::{GridState, movement};
use crate::core::grid::Faction;

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

fn chebyshev(a: (i32, i32), b: (i32, i32)) -> i32 { (a.0 - b.0).abs().max((a.1 - b.1).abs()) }
fn is_adjacent(a: (i32, i32), b: (i32, i32)) -> bool { chebyshev(a, b) == 1 }

#[cfg(test)]
mod tests {
    use super::*;
    use crate::core::battle::model::BattleState;
    use crate::core::grid::GridUnit;

    #[test] fn adjacent_enemy_attacks() { let mut s = BattleState::new(); let hp = s.grid.find_faction(Faction::Hero)[0]; s.grid.remove_unit(hp); s.grid.place_unit((4,1), GridUnit::hero()); assert_eq!(decide(&s.grid), Decision::Attack { target: (4,1) }); }
    #[test] fn enemy_moves_toward_hero() { let s = BattleState::new(); let d = decide(&s.grid); match d { Decision::Move { target, .. } => { assert!(chebyshev(target, (0,2)) < chebyshev((5,1), (0,2))); } _ => panic!("expected Move"), } }
    #[test] fn deterministic_across_calls() { let s = BattleState::new(); assert_eq!(decide(&s.grid), decide(&s.grid)); }
    #[test] fn returns_wait_when_no_enemies() { let mut g = GridState::new(6,4); g.place_unit((0,0), GridUnit::hero()); assert_eq!(decide(&g), Decision::Wait); }
    #[test] fn attacks_after_move_when_possible() { let mut s = BattleState::new(); let hp = s.grid.find_faction(Faction::Hero)[0]; s.grid.remove_unit(hp); s.grid.place_unit((3,1), GridUnit::hero()); let d = decide(&s.grid); match d { Decision::Move { target, attack_after } => { assert!(attack_after.is_some()); assert_eq!(attack_after, Some((3,1))); assert_eq!(target, (4,0)); } _ => panic!("expected Move with attack_after"), } }
    #[test] fn tie_break_lowest_y_then_x() { let mut s = BattleState::new(); let hp = s.grid.find_faction(Faction::Hero)[0]; s.grid.remove_unit(hp); s.grid.place_unit((0,2), GridUnit::hero()); let ep = s.grid.find_faction(Faction::Enemy)[0]; s.grid.remove_unit(ep); s.grid.place_unit((2,2), GridUnit::enemy()); let d = decide(&s.grid); match d { Decision::Move { target, .. } => assert_eq!(target, (1,1)), _ => panic!("expected Move"), } }
}
