use std::collections::HashMap;
use crate::core::constants;
use super::unit::{Faction, GridUnit};

#[derive(Debug, Clone)]
pub struct GridState {
    pub width: i32,
    pub height: i32,
    pub units: HashMap<(i32, i32), GridUnit>,
}

impl GridState {
    #[allow(dead_code, reason = "Public API")]
    pub fn new(width: i32, height: i32) -> Self { Self { width, height, units: HashMap::new() } }

    #[allow(dead_code)]
    pub fn default_grid() -> Self { Self::new(constants::GRID_WIDTH, constants::GRID_HEIGHT) }

    pub fn in_bounds(&self, pos: (i32, i32)) -> bool {
        pos.0 >= 0 && pos.0 < self.width && pos.1 >= 0 && pos.1 < self.height
    }

    pub fn unit_at(&self, pos: (i32, i32)) -> Option<&GridUnit> { self.units.get(&pos) }
    pub fn unit_at_mut(&mut self, pos: (i32, i32)) -> Option<&mut GridUnit> { self.units.get_mut(&pos) }

    #[allow(dead_code)]
    pub fn enemy_at(&self, pos: (i32, i32)) -> bool {
        self.unit_at(pos).is_some_and(|u| u.faction == Faction::Enemy)
    }

    #[allow(dead_code)]
    pub fn friendly_at(&self, pos: (i32, i32), of_unit: (i32, i32)) -> bool {
        if pos == of_unit { return false; }
        let of_faction = match self.unit_at(of_unit) { Some(u) => u.faction, None => return false };
        self.unit_at(pos).is_some_and(|u| u.faction == of_faction)
    }

    pub fn place_unit(&mut self, pos: (i32, i32), unit: GridUnit) { self.units.insert(pos, unit); }
    pub fn remove_unit(&mut self, pos: (i32, i32)) { self.units.remove(&pos); }

    pub fn move_unit(&mut self, from: (i32, i32), to: (i32, i32)) {
        if let Some(unit) = self.units.remove(&from) { self.units.insert(to, unit); }
    }

    pub fn find_faction(&self, faction: Faction) -> Vec<(i32, i32)> {
        let mut result: Vec<(i32, i32)> = self.units.iter()
            .filter(|(_, u)| u.faction == faction && u.alive)
            .map(|(pos, _)| *pos).collect();
        result.sort_by(|a, b| a.1.cmp(&b.1).then(a.0.cmp(&b.0)));
        result
    }

    #[allow(dead_code)]
    pub fn adjacent_enemies(&self, pos: (i32, i32)) -> Vec<(i32, i32)> {
        [(1,0),(-1,0),(0,1),(0,-1),(1,1),(1,-1),(-1,1),(-1,-1)].iter()
            .map(|d| (pos.0 + d.0, pos.1 + d.1))
            .filter(|p| self.enemy_at(*p)).collect()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test] fn in_bounds_accepts_valid() { let g = GridState::default_grid(); assert!(g.in_bounds((0,0))); assert!(g.in_bounds((5,3))); }
    #[test] fn in_bounds_rejects_invalid() { let g = GridState::default_grid(); assert!(!g.in_bounds((-1,0))); assert!(!g.in_bounds((0,-1))); assert!(!g.in_bounds((6,0))); }
    #[test] fn place_and_retrieve_unit() { let mut g = GridState::default_grid(); g.place_unit((2,2), GridUnit::hero()); assert!(g.unit_at((2,2)).is_some()); }
    #[test] fn enemy_at_checks_faction() { let mut g = GridState::default_grid(); g.place_unit((1,1), GridUnit::hero()); g.place_unit((3,3), GridUnit::enemy()); assert!(!g.enemy_at((1,1))); assert!(g.enemy_at((3,3))); }
    #[test] fn friendly_at_different_from_self() { let mut g = GridState::default_grid(); g.place_unit((2,2), GridUnit::hero()); g.place_unit((2,3), GridUnit::hero()); assert!(!g.friendly_at((2,2),(2,2))); assert!(g.friendly_at((2,3),(2,2))); let mut h = GridState::default_grid(); h.place_unit((0,0), GridUnit::hero()); h.place_unit((0,1), GridUnit::enemy()); assert!(!h.friendly_at((0,1),(0,0))); }
    #[test] fn friendly_rejects_enemy() { let mut g = GridState::default_grid(); g.place_unit((0,0), GridUnit::hero()); g.place_unit((1,0), GridUnit::enemy()); assert!(!g.friendly_at((1,0),(0,0))); }
    #[test] fn move_unit_updates_position() { let mut g = GridState::default_grid(); g.place_unit((0,0), GridUnit::hero()); g.move_unit((0,0),(3,2)); assert!(g.unit_at((0,0)).is_none()); assert!(g.unit_at((3,2)).is_some()); }
    #[test] fn find_faction_returns_positions() { let mut g = GridState::default_grid(); g.place_unit((0,0), GridUnit::hero()); g.place_unit((5,3), GridUnit::enemy()); let heroes = g.find_faction(Faction::Hero); assert_eq!(heroes, vec![(0,0)]); }
}
