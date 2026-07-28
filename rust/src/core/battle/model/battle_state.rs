use crate::core::constants;
use crate::core::grid::{Faction, GridState, GridUnit};
use super::phase::Phase;
use super::battle_result::BattleResult;

#[derive(Debug, Clone)]
pub struct BattleState {
    pub grid: GridState,
    pub phase: Phase,
    pub turn_number: i32,
    pub mana: i32,
    pub max_mana: i32,
    pub result: Option<BattleResult>,
}

impl BattleState {
    pub fn new() -> Self {
        let mut grid = GridState::new(constants::GRID_WIDTH, constants::GRID_HEIGHT);
        grid.place_unit(constants::HERO_START, GridUnit::hero());
        grid.place_unit(constants::ENEMY_START, GridUnit::enemy());
        Self {
            grid,
            phase: Phase::PlayerTurn,
            turn_number: 1,
            mana: constants::START_MANA,
            max_mana: constants::MAX_MANA,
            result: None,
        }
    }

    pub fn reset_turn(&mut self) {
        self.turn_number += 1;
        self.mana = self.max_mana;
        for unit in self.grid.units.values_mut() {
            if unit.alive {
                unit.reset_turn();
            }
        }
    }

    pub fn check_over(&mut self) -> bool {
        let hero_alive = self.grid.find_faction(Faction::Hero).iter().any(|p| {
            self.grid.unit_at(*p).is_some_and(|u| u.alive)
        });
        let enemy_alive = self.grid.find_faction(Faction::Enemy).iter().any(|p| {
            self.grid.unit_at(*p).is_some_and(|u| u.alive)
        });
        if !hero_alive {
            self.phase = Phase::BattleOver;
            self.result = Some(BattleResult::Defeat);
            return true;
        }
        if !enemy_alive {
            self.phase = Phase::BattleOver;
            self.result = Some(BattleResult::Victory);
            return true;
        }
        false
    }
}

impl Default for BattleState {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn new_battle_is_player_turn() {
        let s = BattleState::new();
        assert_eq!(s.phase, Phase::PlayerTurn);
        assert_eq!(s.turn_number, 1);
        assert_eq!(s.mana, 3);
    }
    #[test]
    fn reset_turn_increments_counter() {
        let mut s = BattleState::new();
        s.reset_turn();
        assert_eq!(s.turn_number, 2);
    }
    #[test]
    fn reset_turn_refills_mana() {
        let mut s = BattleState::new();
        s.mana = 0;
        s.reset_turn();
        assert_eq!(s.mana, 3);
    }
    #[test]
    fn reset_turn_clears_unit_flags() {
        let mut s = BattleState::new();
        for unit in s.grid.units.values_mut() {
            unit.has_moved = true;
            unit.has_attacked = true;
        }
        s.reset_turn();
        for unit in s.grid.units.values_mut() {
            assert!(!unit.has_moved);
            assert!(!unit.has_attacked);
        }
    }
    #[test]
    fn battle_not_over_initially() {
        let mut s = BattleState::new();
        assert!(!s.check_over());
        assert!(s.result.is_none());
    }
    #[test]
    fn victory_when_enemy_dead() {
        let mut s = BattleState::new();
        for pos in s.grid.find_faction(Faction::Enemy) {
            s.grid.remove_unit(pos);
        }
        assert!(s.check_over());
        assert_eq!(s.result, Some(BattleResult::Victory));
    }
    #[test]
    fn defeat_when_hero_dead() {
        let mut s = BattleState::new();
        for pos in s.grid.find_faction(Faction::Hero) {
            if let Some(u) = s.grid.unit_at_mut(pos) {
                u.alive = false;
            }
        }
        assert!(s.check_over());
        assert_eq!(s.result, Some(BattleResult::Defeat));
    }
    #[test]
    fn hero_and_enemy_placed_correctly() {
        let s = BattleState::new();
        assert!(s.grid.unit_at(constants::HERO_START).is_some());
        assert_eq!(s.grid.unit_at(constants::HERO_START).unwrap().faction, Faction::Hero);
        assert!(s.grid.unit_at(constants::ENEMY_START).is_some());
        assert_eq!(s.grid.unit_at(constants::ENEMY_START).unwrap().faction, Faction::Enemy);
    }
}
