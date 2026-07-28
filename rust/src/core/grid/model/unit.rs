use crate::core::constants;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Faction {
    Hero,
    Enemy,
}

#[derive(Debug, Clone)]
pub struct GridUnit {
    pub faction: Faction,
    pub hp: i32,
    pub max_hp: i32,
    pub atk: i32,
    pub has_moved: bool,
    pub has_attacked: bool,
    pub alive: bool,
}

impl GridUnit {
    pub fn new(faction: Faction, hp: i32, atk: i32) -> Self {
        Self { faction, hp, max_hp: hp, atk, has_moved: false, has_attacked: false, alive: true }
    }

    pub fn take_damage(&mut self, amount: i32) -> i32 {
        let actual = amount.min(self.hp);
        self.hp -= actual;
        if self.hp <= 0 { self.alive = false; }
        actual
    }

    pub fn reset_turn(&mut self) {
        self.has_moved = false;
        self.has_attacked = false;
    }

    pub fn hero() -> Self { Self::new(Faction::Hero, constants::HERO_HP, constants::HERO_ATK) }
    pub fn enemy() -> Self { Self::new(Faction::Enemy, constants::ENEMY_HP, constants::ENEMY_ATK) }
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn new_unit_has_full_hp() {
        let u = GridUnit::new(Faction::Hero, 30, 2);
        assert_eq!(u.hp, 30); assert_eq!(u.max_hp, 30); assert!(u.alive);
    }
    #[test]
    fn take_damage_reduces_hp() {
        let mut u = GridUnit::new(Faction::Hero, 30, 2);
        assert_eq!(u.take_damage(5), 5); assert_eq!(u.hp, 25); assert!(u.alive);
    }
    #[test]
    fn take_damage_clamped_to_hp() {
        let mut u = GridUnit::new(Faction::Hero, 10, 2);
        assert_eq!(u.take_damage(100), 10); assert_eq!(u.hp, 0); assert!(!u.alive);
    }
    #[test]
    fn reset_turn_clears_flags() {
        let mut u = GridUnit::new(Faction::Hero, 30, 2);
        u.has_moved = true; u.has_attacked = true;
        u.reset_turn(); assert!(!u.has_moved); assert!(!u.has_attacked);
    }
    #[test]
    fn hero_shortcut() { let u = GridUnit::hero(); assert_eq!(u.faction, Faction::Hero); assert_eq!(u.hp, constants::HERO_HP); assert_eq!(u.atk, constants::HERO_ATK); }
    #[test]
    fn enemy_shortcut() { let u = GridUnit::enemy(); assert_eq!(u.faction, Faction::Enemy); assert_eq!(u.hp, constants::ENEMY_HP); assert_eq!(u.atk, constants::ENEMY_ATK); }
}
