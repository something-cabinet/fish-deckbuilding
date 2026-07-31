use serde::{Deserialize, Serialize};
use crate::core::cards::affix;
use crate::core::cards::affix::CorruptOutcome;
use crate::core::cards::CardDef;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum NodeType {
    Battle,
    Boss,
    Rest,
    Shop,
    #[allow(dead_code)]
    Enchanter,
    #[allow(dead_code)]
    Gambler,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct OverworldNode {
    pub id: String,
    pub node_type: NodeType,
    pub connections: Vec<String>,
    pub grid_x: i32,
    pub grid_y: i32,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct RunState {
    pub gold: i32,
    pub hp: i32,
    pub max_hp: i32,
    pub card_collection: Vec<CardDef>,
    pub combat_deck: Vec<CardDef>,
    pub stash: Vec<CardDef>,
    #[allow(dead_code)]
    pub current_node: Option<String>,
    #[allow(dead_code)]
    pub unlocked_zones: Vec<String>,
    pub defeated_nodes: Vec<String>,
    pub last_corrupt_outcome: Option<CorruptOutcome>,
}

impl RunState {
    pub fn new(hp: i32, max_hp: i32, starter_collection: Vec<CardDef>) -> Self {
        let mut state = Self {
            gold: 100000,
            hp,
            max_hp,
            card_collection: starter_collection,
            combat_deck: Vec::new(),
            stash: Vec::new(),
            current_node: None,
            unlocked_zones: vec!["zone_1".to_string()],
            defeated_nodes: Vec::new(),
            last_corrupt_outcome: None,
        };
        state.reset_combat_deck();
        state
    }

    pub fn reset_combat_deck(&mut self) {
        self.combat_deck.clear();
        self.stash.clear();
        for card in &self.card_collection {
            if self.combat_deck.len() < 10 {
                self.combat_deck.push(card.clone());
            } else {
                self.stash.push(card.clone());
            }
        }
    }

    pub fn heal(&mut self, amount: i32) {
        self.hp = (self.hp + amount).min(self.max_hp);
    }

    pub fn add_card(&mut self, card: CardDef) {
        self.card_collection.push(card);
    }

    pub fn add_gold(&mut self, amount: i32) {
        self.gold += amount;
    }

    pub fn spend_gold(&mut self, amount: i32) -> bool {
        if self.gold >= amount {
            self.gold -= amount;
            true
        } else {
            false
        }
    }

    #[allow(dead_code)]
    pub fn swap_deck_stash(&mut self, deck_idx: usize, stash_idx: usize) -> bool {
        if deck_idx >= self.combat_deck.len() && stash_idx >= self.stash.len() {
            return false;
        }
        if deck_idx < self.combat_deck.len() && stash_idx < self.stash.len() {
            self.combat_deck.swap(deck_idx, stash_idx);
            true
        } else if deck_idx < self.combat_deck.len() && stash_idx >= self.stash.len() {
            if self.stash.len() < 30 {
                let card = self.combat_deck.remove(deck_idx);
                self.stash.push(card);
                true
            } else { false }
        } else if deck_idx >= self.combat_deck.len() && stash_idx < self.stash.len() {
            if self.combat_deck.len() < 10 {
                let card = self.stash.remove(stash_idx);
                self.combat_deck.push(card);
                true
            } else { false }
        } else {
            false
        }
    }

    pub fn gambler_reroll_affix(&mut self, deck_idx: usize, seed: u64) -> Option<&CardDef> {
        if deck_idx >= self.combat_deck.len() { return None; }
        if self.combat_deck[deck_idx].corrupted || self.combat_deck[deck_idx].affixes.is_empty() { return None; }
        if !self.spend_gold(50) { return None; }
        let card = self.combat_deck[deck_idx].clone();
        let new_card = affix::gambler_reroll_affix(&card, seed);
        self.combat_deck[deck_idx] = new_card;
        Some(&self.combat_deck[deck_idx])
    }

    pub fn enchanter_add_slot(&mut self, deck_idx: usize, seed: u64) -> Option<&CardDef> {
        if deck_idx >= self.combat_deck.len() { return None; }
        if self.combat_deck[deck_idx].corrupted { return None; }
        if self.combat_deck[deck_idx].affixes.len() >= self.combat_deck[deck_idx].rarity.max_affixes() { return None; }
        if !self.spend_gold(100) { return None; }
        let card = self.combat_deck[deck_idx].clone();
        let new_card = affix::enchanter_add_slot(&card, seed);
        self.combat_deck[deck_idx] = new_card;
        Some(&self.combat_deck[deck_idx])
    }

    pub fn corrupt_card(&mut self, deck_idx: usize, seed: u64) -> Option<&CardDef> {
        if deck_idx >= self.combat_deck.len() { return None; }
        if self.combat_deck[deck_idx].corrupted { return None; }
        if !self.spend_gold(200) { return None; }
        let card = self.combat_deck[deck_idx].clone();
        let (new_card, outcome) = affix::corrupt(&card, seed);
        self.last_corrupt_outcome = Some(outcome);
        self.combat_deck[deck_idx] = new_card;
        Some(&self.combat_deck[deck_idx])
    }
}

pub fn create_zone_1() -> Vec<OverworldNode> {
    vec![
        OverworldNode { id: "start".into(), node_type: NodeType::Rest, connections: vec!["battle_1a".into(), "battle_1b".into(), "gambler_1".into()], grid_x: 2, grid_y: 0 },
        OverworldNode { id: "gambler_1".into(), node_type: NodeType::Gambler, connections: vec!["enchanter_1".into()], grid_x: 2, grid_y: 1 },
        OverworldNode { id: "battle_1a".into(), node_type: NodeType::Battle, connections: vec!["shop_1".into()], grid_x: 0, grid_y: 2 },
        OverworldNode { id: "battle_1b".into(), node_type: NodeType::Battle, connections: vec!["rest_1".into()], grid_x: 4, grid_y: 2 },
        OverworldNode { id: "enchanter_1".into(), node_type: NodeType::Enchanter, connections: vec!["shop_1".into(), "rest_1".into()], grid_x: 2, grid_y: 3 },
        OverworldNode { id: "shop_1".into(), node_type: NodeType::Shop, connections: vec!["boss_1".into()], grid_x: 0, grid_y: 4 },
        OverworldNode { id: "rest_1".into(), node_type: NodeType::Rest, connections: vec!["boss_1".into()], grid_x: 4, grid_y: 4 },
        OverworldNode { id: "boss_1".into(), node_type: NodeType::Boss, connections: vec!["zone_2_gate".into()], grid_x: 2, grid_y: 6 },
    ]
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::core::cards::Rarity;

    fn dummy_card(id: &'static str) -> CardDef {
        CardDef::new(id, "Test", 1, vec![], Rarity::Common)
    }

    #[test]
    fn run_state_starts_with_gold() {
        let s = RunState::new(30, 30, vec![]);
        assert_eq!(s.gold, 100000);
    }

    #[test]
    fn heal_does_not_exceed_max() {
        let mut s = RunState::new(25, 30, vec![]);
        s.heal(10);
        assert_eq!(s.hp, 30);
    }

    #[test]
    fn add_gold_increases() {
        let mut s = RunState::new(30, 30, vec![]);
        s.add_gold(50);
        assert_eq!(s.gold, 100050);
    }

    #[test]
    fn spend_gold_returns_false_if_insufficient() {
        let mut s = RunState::new(30, 30, vec![]);
        assert!(!s.spend_gold(100001));
    }

    #[test]
    fn swap_deck_stash_moves_card() {
        let mut s = RunState::new(30, 30, vec![
            dummy_card("a"), dummy_card("b"), dummy_card("c"),
        ]);
        s.reset_combat_deck();
        assert_eq!(s.combat_deck.len(), 3);
        assert!(s.swap_deck_stash(0, 0));
        assert_eq!(s.combat_deck.len(), 2);
        assert_eq!(s.stash.len(), 1);
    }

    #[test]
    fn zone_1_has_8_nodes() {
        let zone = create_zone_1();
        assert_eq!(zone.len(), 8);
    }

    #[test]
    fn zone_1_has_enchanter() {
        let zone = create_zone_1();
        assert!(zone.iter().any(|n| n.id == "enchanter_1"));
    }

    #[test]
    fn zone_1_has_gambler() {
        let zone = create_zone_1();
        assert!(zone.iter().any(|n| n.id == "gambler_1"));
    }

    #[test]
    fn gambler_reroll_returns_none_on_corrupted() {
        let mut s = RunState::new(30, 30, vec![
            dummy_card("a").with_corrupted(true),
        ]);
        s.reset_combat_deck();
        s.gold = 100;
        assert!(s.gambler_reroll_affix(0, 42).is_none());
    }

    #[test]
    fn enchanter_add_slot_returns_none_on_corrupted() {
        let mut s = RunState::new(30, 30, vec![
            CardDef::new("a", "A", 1, vec![], Rarity::Uncommon).with_corrupted(true),
        ]);
        s.reset_combat_deck();
        s.gold = 100;
        assert!(s.enchanter_add_slot(0, 42).is_none());
    }

    #[test]
    fn corrupt_card_returns_none_on_already_corrupted() {
        let mut s = RunState::new(30, 30, vec![
            dummy_card("a").with_corrupted(true),
        ]);
        s.reset_combat_deck();
        s.gold = 200;
        assert!(s.corrupt_card(0, 42).is_none());
    }
}