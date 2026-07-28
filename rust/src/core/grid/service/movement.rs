/// BFS movement range computation — pure function.
use std::collections::{HashMap, VecDeque};
use crate::core::grid::model::GridState;
#[cfg(test)]
use crate::core::constants;

const DIRS_8: [(i32, i32); 8] = [
    (1,0),(-1,0),(0,1),(0,-1),(1,1),(1,-1),(-1,1),(-1,-1),
];

pub fn get_movement_range(state: &GridState, from: (i32, i32), budget: i32) -> Vec<(i32, i32)> {
    let mut best: HashMap<(i32, i32), i32> = HashMap::new();
    let mut reachable: Vec<(i32, i32)> = Vec::new();
    let mut queue: VecDeque<((i32, i32), i32)> = VecDeque::new();
    best.insert(from, budget);
    queue.push_back((from, budget));

    while let Some((cur_pos, cur_budget)) = queue.pop_front() {
        for d in &DIRS_8 {
            let next = (cur_pos.0 + d.0, cur_pos.1 + d.1);
            let cost = if d.0 != 0 && d.1 != 0 { 2 } else { 1 };
            if cur_budget < cost { continue; }
            if !state.in_bounds(next) { continue; }
            let remaining = cur_budget - cost;
            if let Some(&prev) = best.get(&next) { if prev >= remaining { continue; } }
            best.insert(next, remaining);
            if let Some(unit) = state.unit_at(next) {
                let origin_faction = state.unit_at(from).map(|u| u.faction);
                if Some(unit.faction) == origin_faction && next != from {
                    queue.push_back((next, remaining));
                }
                continue;
            }
            reachable.push(next);
            queue.push_back((next, remaining));
        }
    }
    reachable
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::core::grid::GridUnit;

    fn empty_grid() -> GridState { GridState::new(constants::GRID_WIDTH, constants::GRID_HEIGHT) }

    #[test] fn budget_2_simple_reachability() {
        let mut g = empty_grid(); g.place_unit((0,2), GridUnit::hero());
        let r = get_movement_range(&g, (0,2), 2);
        assert!(r.contains(&(0,1))); assert!(r.contains(&(1,2))); assert!(!r.contains(&(3,2)));
    }
    #[test] fn start_not_in_reachable() { let mut g = empty_grid(); g.place_unit((2,2), GridUnit::hero()); let r = get_movement_range(&g, (2,2), 2); assert!(!r.contains(&(2,2))); }
    #[test] fn diagonal_costs_2() { let mut g = empty_grid(); g.place_unit((2,2), GridUnit::hero()); let r = get_movement_range(&g, (2,2), 2); assert!(r.contains(&(3,3))); assert!(!r.contains(&(4,4))); }
    #[test] fn enemy_blocks_landing_and_pass_through() { let mut g = empty_grid(); g.place_unit((0,2), GridUnit::hero()); g.place_unit((1,2), GridUnit::enemy()); let r = get_movement_range(&g, (0,2), 2); assert!(!r.contains(&(1,2))); assert!(!r.contains(&(2,2))); }
    #[test] fn friendly_pass_through_not_land() { let mut g = empty_grid(); g.place_unit((0,2), GridUnit::hero()); g.place_unit((0,3), GridUnit::hero()); let r = get_movement_range(&g, (0,2), 2); assert!(!r.contains(&(0,3))); assert!(r.contains(&(1,3))); }
    #[test] fn out_of_bounds_excluded() { let mut g = empty_grid(); g.place_unit((0,0), GridUnit::hero()); let r = get_movement_range(&g, (0,0), 2); for pos in &r { assert!(pos.0 >= 0 && pos.1 >= 0 && pos.0 < constants::GRID_WIDTH && pos.1 < constants::GRID_HEIGHT); } }
    #[test] fn budget_0_returns_nothing() { let mut g = empty_grid(); g.place_unit((2,2), GridUnit::hero()); let r = get_movement_range(&g, (2,2), 0); assert!(r.is_empty()); }
    #[test] fn corner_blocked_by_two_enemies() { let mut g = empty_grid(); g.place_unit((0,0), GridUnit::hero()); g.place_unit((1,0), GridUnit::enemy()); g.place_unit((0,1), GridUnit::enemy()); let r = get_movement_range(&g, (0,0), 2); assert!(r.contains(&(1,1))); }
}
