use crate::core::cards::{CardDef, Deck, Graveyard, Hand, starter_deck};
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
    pub hand: Hand,
    pub deck: Deck,
    pub graveyard: Graveyard,
    pub replace_used: bool,
    pub enemy_hand: Hand,
    pub enemy_deck: Deck,
    pub enemy_graveyard: Graveyard,
    pub enemy_mana: i32,
    pub enemy_max_mana: i32,
}

impl BattleState {
    pub fn new() -> Self {
        let mut grid = GridState::new(constants::GRID_WIDTH, constants::GRID_HEIGHT);
        grid.place_unit(constants::HERO_START, GridUnit::hero());
        grid.place_unit(constants::ENEMY_START, GridUnit::enemy());

        let mut deck = Deck::new(starter_deck());
        deck.shuffle(42);
        let mut hand = Hand::new(5);
        for _ in 0..5 { if let Some(c) = deck.draw() { hand.add(c); } }

        let mut enemy_deck = Deck::new(starter_deck());
        enemy_deck.shuffle(99);
        let mut enemy_hand = Hand::new(3);
        for _ in 0..3 { if let Some(c) = enemy_deck.draw() { enemy_hand.add(c); } }

        Self {
            grid, phase: Phase::PlayerTurn, turn_number: 1,
            mana: constants::START_MANA, max_mana: constants::START_MANA, result: None,
            hand, deck, graveyard: Graveyard::new(),
            replace_used: false,
            enemy_hand, enemy_deck, enemy_graveyard: Graveyard::new(),
            enemy_mana: 0, enemy_max_mana: 5,
        }
    }

    pub fn reset_turn(&mut self) {
        self.turn_number += 1;
        // Mana ramping: +1 max_mana per turn, start at 1, max 9
        if self.max_mana < constants::MAX_MANA {
            self.max_mana += 1;
        }
        self.mana = self.max_mana;
        self.replace_used = false;
        for unit in self.grid.units.values_mut() {
            if unit.alive { unit.reset_turn(); }
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

    pub fn draw_player_card(&mut self) {
        if self.deck.is_empty() {
            let recycled = self.graveyard.drain();
            self.deck = Deck::new(recycled);
            self.deck.shuffle(self.turn_number as u64);
        }
        if let Some(c) = self.deck.draw() {
            self.hand.add(c);
        }
    }

    pub fn draw_enemy_card(&mut self) {
        if self.enemy_deck.is_empty() {
            let recycled = self.enemy_graveyard.drain();
            self.enemy_deck = Deck::new(recycled);
            self.enemy_deck.shuffle((self.turn_number + 100) as u64);
        }
        if let Some(c) = self.enemy_deck.draw() {
            self.enemy_hand.add(c);
        }
    }

    pub fn replace_card(&mut self, hand_index: usize) -> bool {
        if self.replace_used { return false; }
        if hand_index >= self.hand.len() { return false; }
        let card = self.hand.remove(hand_index);
        let Some(card) = card else { return false; };
        self.deck.push(card);
        self.deck.shuffle(self.turn_number as u64 + hand_index as u64);
        if let Some(c) = self.deck.draw() {
            self.hand.add(c);
        }
        self.replace_used = true;
        true
    }

    pub fn can_play_card(&self, hand_index: usize) -> bool {
        if hand_index >= self.hand.len() { return false; }
        let card = &self.hand.cards[hand_index];
        card.cost <= self.mana
    }

    pub fn play_card(&mut self, hand_index: usize) -> Option<CardDef> {
        if !self.can_play_card(hand_index) { return None; }
        let card = self.hand.remove(hand_index)?;
        self.mana -= card.cost;
        self.graveyard.add(card.clone());
        Some(card)
    }
}

impl Default for BattleState {
    fn default() -> Self { Self::new() }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::core::cards::all_starter_cards;

    #[test]
    fn new_battle_has_hand_of_5() {
        let s = BattleState::new();
        assert_eq!(s.hand.len(), 5);
    }

    #[test]
    fn new_battle_has_deck_of_21() {
        let s = BattleState::new();
        // 26 starter cards - 5 drawn to hand = 21
        assert_eq!(s.deck.len(), 21);
    }

    #[test]
    fn new_battle_enemy_has_hand_of_3() {
        let s = BattleState::new();
        assert_eq!(s.enemy_hand.len(), 3);
    }

    #[test]
    fn draw_player_card_increases_hand() {
        let mut s = BattleState::new();
        s.hand = Hand::new(5);
        assert_eq!(s.hand.len(), 0);
        s.draw_player_card();
        assert_eq!(s.hand.len(), 1);
        assert_eq!(s.deck.len(), 20);
    }

    #[test]
    fn draw_when_deck_empty_recycles_graveyard() {
        let mut s = BattleState::new();
        s.hand = Hand::new(5);
        s.deck = Deck::new(vec![]);
        s.graveyard.add(all_starter_cards()[0].clone());
        let before = s.hand.len();
        s.draw_player_card();
        assert_eq!(s.hand.len(), before + 1);
        // 1 card recycled from graveyard, then drawn
        assert_eq!(s.deck.len(), 0);
    }

    #[test]
    fn replace_card_swaps_hand_card() {
        let mut s = BattleState::new();
        let before = s.hand.len();
        let old_id = s.hand.cards[0].id;
        assert!(s.replace_card(0));
        assert_eq!(s.hand.len(), before);
        assert!(s.replace_used);
        if s.hand.len() > 0 {
            assert!(s.hand.cards[0].id != old_id || s.hand.len() < before);
        }
    }

    #[test]
    fn replace_card_only_once_per_turn() {
        let mut s = BattleState::new();
        assert!(s.replace_card(0));
        assert!(!s.replace_card(0));
    }

    #[test]
    fn can_play_card_checks_mana() {
        let mut s = BattleState::new();
        s.mana = 0;
        let affordable = (0..s.hand.len()).any(|i| s.can_play_card(i));
        let all_zero_cost = s.hand.cards.iter().all(|c| c.cost == 0);
        if all_zero_cost {
            assert!(affordable);
        }
    }

    #[test]
    fn play_card_deducts_mana_and_moves_to_graveyard() {
        let mut s = BattleState::new();
        let idx = s.hand.cards.iter().position(|c| c.cost <= s.mana);
        if let Some(i) = idx {
            let cost = s.hand.cards[i].cost;
            let mana_before = s.mana;
            assert!(s.play_card(i).is_some());
            assert_eq!(s.mana, mana_before - cost);
            assert_eq!(s.graveyard.len(), 1);
        }
    }

    #[test]
    fn reset_turn_clears_replace_flag() {
        let mut s = BattleState::new();
        s.replace_used = true;
        s.reset_turn();
        assert!(!s.replace_used);
    }

    #[test]
    fn starting_mana_is_1() {
        let s = BattleState::new();
        assert_eq!(s.max_mana, 1);
        assert_eq!(s.mana, 1);
    }

    #[test]
    fn mana_hud_values_are_correct() {
        let mut s = BattleState::new();
        // Turn 1: start 1/1
        assert_eq!(s.mana, 1);
        assert_eq!(s.max_mana, 1);
        // After reset (simulating end of turn + start of next): 2/2
        s.reset_turn();
        assert_eq!(s.mana, 2);
        assert_eq!(s.max_mana, 2);
    }

    #[test]
    fn mana_ramps_by_1_per_turn() {
        let mut s = BattleState::new();
        assert_eq!(s.max_mana, 1);
        assert_eq!(s.mana, 1);
        s.reset_turn(); // → turn 2
        assert_eq!(s.max_mana, 2);
        assert_eq!(s.mana, 2);
        s.reset_turn(); // → turn 3
        assert_eq!(s.max_mana, 3);
        assert_eq!(s.mana, 3);
    }

    #[test]
    fn mana_capped_at_9() {
        let mut s = BattleState::new();
        s.max_mana = 9;
        s.mana = 9;
        s.reset_turn();
        assert_eq!(s.max_mana, 9);
        assert_eq!(s.mana, 9);
        s.reset_turn();
        assert_eq!(s.max_mana, 9);
        assert_eq!(s.mana, 9);
    }
}