use crate::core::cards::Effect;
use crate::core::constants;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Faction {
    Hero,
    Enemy,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Default)]
pub enum Range {
    #[default]
    Melee,
    Ranged,
}

impl Range {
    /// Returns the maximum distance (in Chebyshev metric) this range type
    /// can reach. Used for targeting validation in Phase 1; Phase 2 will
    /// provide proper range-based attack checking.
    #[allow(dead_code, reason = "Public API — unused after valid_targets() adoption, keep for external crate consumers")]
    pub fn max_distance(&self) -> i32 {
        match self {
            Range::Melee => 1,
            Range::Ranged => constants::GRID_WIDTH + constants::GRID_HEIGHT,
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum Keyword {
    Taunt,
    Elusive,
    #[allow(dead_code, reason = "Constructed in tests; engine matches on it")]
    PartingGift(Effect),
    #[allow(dead_code, reason = "Stub — will be triggered on summon in future Phase")]
    Commencement(Effect),
}

#[derive(Debug, Clone)]
pub struct GridUnit {
    pub faction: Faction,
    pub hp: i32,
    pub max_hp: i32,
    pub atk: i32,
    #[allow(dead_code, reason = "Used in Phase 2 for range-based attack checking")]
    pub range: Range,
    pub moves_made: i32,
    pub max_moves: i32,
    pub attacks_made: i32,
    pub max_attacks: i32,
    pub alive: bool,
    pub keywords: Vec<Keyword>,
}

impl GridUnit {
    pub fn new(faction: Faction, hp: i32, atk: i32, range: Range) -> Self {
        Self {
            faction,
            hp,
            max_hp: hp,
            atk,
            range,
            moves_made: 0,
            max_moves: 1,
            attacks_made: 0,
            max_attacks: 1,
            alive: true,
            keywords: vec![],
        }
    }

    pub fn take_damage(&mut self, amount: i32) -> i32 {
        let actual = amount.min(self.hp);
        self.hp -= actual;
        if self.hp <= 0 { self.alive = false; }
        actual
    }

    pub fn exhausted(&self) -> bool {
        self.attacks_made >= self.max_attacks
    }

    pub fn reset_turn(&mut self) {
        self.moves_made = 0;
        self.attacks_made = 0;
    }

    pub fn hero() -> Self { Self::new(Faction::Hero, constants::HERO_HP, constants::HERO_ATK, Range::Melee) }
    pub fn enemy() -> Self { Self::new(Faction::Enemy, constants::ENEMY_HP, constants::ENEMY_ATK, Range::Melee) }
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn new_unit_has_full_hp() {
        let u = GridUnit::new(Faction::Hero, 30, 2, Range::Melee);
        assert_eq!(u.hp, 30); assert_eq!(u.max_hp, 30); assert!(u.alive);
    }
    #[test]
    fn take_damage_reduces_hp() {
        let mut u = GridUnit::new(Faction::Hero, 30, 2, Range::Melee);
        assert_eq!(u.take_damage(5), 5); assert_eq!(u.hp, 25); assert!(u.alive);
    }
    #[test]
    fn take_damage_clamped_to_hp() {
        let mut u = GridUnit::new(Faction::Hero, 10, 2, Range::Melee);
        assert_eq!(u.take_damage(100), 10); assert_eq!(u.hp, 0); assert!(!u.alive);
    }
    #[test]
    fn reset_turn_clears_flags() {
        let mut u = GridUnit::new(Faction::Hero, 30, 2, Range::Melee);
        u.moves_made = 2; u.attacks_made = 1;
        u.reset_turn(); assert_eq!(u.moves_made, 0); assert_eq!(u.attacks_made, 0);
    }
    #[test]
    fn hero_shortcut() { let u = GridUnit::hero(); assert_eq!(u.faction, Faction::Hero); assert_eq!(u.hp, constants::HERO_HP); assert_eq!(u.atk, constants::HERO_ATK); }
    #[test]
    fn enemy_shortcut() { let u = GridUnit::enemy(); assert_eq!(u.faction, Faction::Enemy); assert_eq!(u.hp, constants::ENEMY_HP); assert_eq!(u.atk, constants::ENEMY_ATK); }

    // --- Phase 1: Core Types + Grid Expansion ---

    #[test]
    fn default_range_is_melee() {
        let u = GridUnit::new(Faction::Hero, 30, 2, Range::Melee);
        assert_eq!(u.range, Range::Melee);
    }

    #[test]
    fn ranged_unit_has_ranged() {
        let u = GridUnit::new(Faction::Enemy, 10, 2, Range::Ranged);
        assert_eq!(u.range, Range::Ranged);
    }

    #[test]
    fn exhaustion_counters_start_at_zero() {
        let u = GridUnit::new(Faction::Hero, 30, 2, Range::Melee);
        assert_eq!(u.moves_made, 0);
        assert_eq!(u.attacks_made, 0);
        assert_eq!(u.max_moves, 1);
        assert_eq!(u.max_attacks, 1);
    }

    #[test]
    fn is_not_exhausted_initially() {
        let u = GridUnit::new(Faction::Hero, 30, 2, Range::Melee);
        assert!(!u.exhausted());
    }

    #[test]
    fn exhausted_when_no_attacks_left() {
        let mut u = GridUnit::new(Faction::Hero, 30, 2, Range::Melee);
        u.attacks_made = 1;
        assert!(u.exhausted());
    }

    #[test]
    fn not_exhausted_when_attacks_remain() {
        let mut u = GridUnit::new(Faction::Hero, 30, 2, Range::Melee);
        u.attacks_made = 0;
        assert!(!u.exhausted());
    }

    #[test]
    fn reset_turn_clears_exhaustion_counters() {
        let mut u = GridUnit::new(Faction::Hero, 30, 2, Range::Melee);
        u.moves_made = 2;
        u.attacks_made = 1;
        u.reset_turn();
        assert_eq!(u.moves_made, 0);
        assert_eq!(u.attacks_made, 0);
    }

    // --- Phase 6: Keywords (Taunt, Elusive, Parting Gift, Commencement) ---

    #[test]
    fn keywords_stored_on_grid_unit() {
        let mut u = GridUnit::new(Faction::Enemy, 10, 2, Range::Melee);
        u.keywords = vec![Keyword::Taunt];
        assert!(u.keywords.contains(&Keyword::Taunt));
    }

    #[test]
    fn keyword_elusive_can_be_stored() {
        let mut u = GridUnit::new(Faction::Hero, 30, 2, Range::Melee);
        u.keywords = vec![Keyword::Elusive];
        assert!(u.keywords.contains(&Keyword::Elusive));
    }

    #[test]
    fn keyword_parting_gift_stores_effect() {
        let mut u = GridUnit::new(Faction::Enemy, 10, 2, Range::Melee);
        u.keywords = vec![Keyword::PartingGift(Effect::Damage(5))];
        assert!(u.keywords.contains(&Keyword::PartingGift(Effect::Damage(5))));
        assert!(!u.keywords.contains(&Keyword::PartingGift(Effect::Damage(3))));
    }

    #[test]
    fn keyword_commencement_stores_effect() {
        let mut u = GridUnit::new(Faction::Enemy, 10, 2, Range::Melee);
        u.keywords = vec![Keyword::Commencement(Effect::Heal(5))];
        assert!(u.keywords.contains(&Keyword::Commencement(Effect::Heal(5))));
    }

    #[test]
    fn multiple_keywords_supported() {
        let mut u = GridUnit::new(Faction::Enemy, 10, 2, Range::Melee);
        u.keywords = vec![Keyword::Taunt, Keyword::Elusive];
        assert_eq!(u.keywords.len(), 2);
    }
}
