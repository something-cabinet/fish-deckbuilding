use std::collections::{HashMap, VecDeque};
use crate::core::grid::model::{GridState, Keyword, Faction};
#[cfg(test)]
use crate::core::constants;

pub(crate) const DIRS_8: [(i32, i32); 8] = [
    (1,0),(-1,0),(0,1),(0,-1),(1,1),(1,-1),(-1,1),(-1,-1),
];

pub fn get_movement_range(state: &GridState, from: (i32, i32), budget: i32) -> Vec<(i32, i32)> {
    let Some(origin_unit) = state.unit_at(from) else { return vec![]; };
    let origin_faction = origin_unit.faction;
    let origin_elusive = origin_unit.keywords.contains(&Keyword::Elusive);

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
            // Taunt blocking: stepping into a tile adjacent to enemy Taunt is blocked (unless Elusive)
            if !origin_elusive && tile_adjacent_to_enemy_taunt(state, next, origin_faction) {
                continue;
            }
            let remaining = cur_budget - cost;
            if let Some(&prev) = best.get(&next) { if prev >= remaining { continue; } }
            best.insert(next, remaining);
            if let Some(unit) = state.unit_at(next) {
                if unit.faction == origin_faction && next != from {
                    // Friendly: pass-through but don't land
                    queue.push_back((next, remaining));
                } else if origin_elusive && next != from {
                    // Elusive: pass-through enemy-occupied tiles but don't land
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

fn tile_adjacent_to_enemy_taunt(state: &GridState, pos: (i32, i32), unit_faction: Faction) -> bool {
    for d in &DIRS_8 {
        let ap = (pos.0 + d.0, pos.1 + d.1);
        if let Some(u) = state.unit_at(ap) {
            if u.alive && u.faction != unit_faction && u.keywords.contains(&Keyword::Taunt) {
                return true;
            }
        }
    }
    false
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::core::grid::{GridUnit, Range};

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

    // --- Phase 6: Keyword movement effects ---

    #[test]
    fn taunt_blocks_adjacent_tiles() {
        let mut grid = GridState::new(5, 1);
        grid.place_unit((0, 0), GridUnit::hero());
        let mut taunt = GridUnit::new(Faction::Enemy, 10, 2, Range::Melee);
        taunt.keywords = vec![Keyword::Taunt];
        grid.place_unit((2, 0), taunt);
        // Tile (1,0) is adjacent to taunt at (2,0) → blocked
        let range = get_movement_range(&grid, (0, 0), 2);
        assert!(!range.contains(&(1, 0)), "(1,0) is adjacent to taunt, should be blocked");
    }

    #[test]
    fn elusive_bypasses_taunt_blocking() {
        let mut grid = GridState::new(5, 1);
        let mut hero = GridUnit::hero();
        hero.keywords = vec![Keyword::Elusive];
        grid.place_unit((0, 0), hero);
        let mut taunt = GridUnit::new(Faction::Enemy, 10, 2, Range::Melee);
        taunt.keywords = vec![Keyword::Taunt];
        grid.place_unit((2, 0), taunt);
        // Elusive ignores Taunt blocking — can step into (1,0) despite taunt adjacency
        let range = get_movement_range(&grid, (0, 0), 2);
        assert!(range.contains(&(1, 0)), "Elusive unit should bypass taunt blocking");
        // Can reach (3,0) with budget 3 (step to (1,0)=1, pass through (2,0)=1, land at (3,0)=1)
        let range3 = get_movement_range(&grid, (0, 0), 3);
        assert!(range3.contains(&(3, 0)), "Elusive unit should reach beyond taunt");
    }

    #[test]
    fn elusive_passes_through_enemy_occupied_tiles() {
        let mut grid = GridState::new(5, 1);
        let mut hero = GridUnit::hero();
        hero.keywords = vec![Keyword::Elusive];
        grid.place_unit((0, 0), hero);
        grid.place_unit((2, 0), GridUnit::enemy()); // blocks pass-through normally
        let range = get_movement_range(&grid, (0, 0), 4);
        // Elusive should allow passing through the enemy tile to reach beyond
        assert!(range.contains(&(3, 0)), "Elusive should pass through enemy-occupied tile");
        // But should NOT land on the enemy tile (still occupied)
        assert!(!range.contains(&(2, 0)), "Elusive cannot land on occupied tile");
    }

    #[test]
    fn non_elusive_cannot_pass_through_enemy() {
        let mut grid = GridState::new(5, 1);
        grid.place_unit((0, 0), GridUnit::hero());
        grid.place_unit((2, 0), GridUnit::enemy());
        let range = get_movement_range(&grid, (0, 0), 4);
        // Non-Elusive cannot pass through enemy — (3,0) is beyond enemy at (2,0)
        assert!(!range.contains(&(3, 0)), "Non-Elusive cannot pass through enemy-occupied tile");
    }
}
