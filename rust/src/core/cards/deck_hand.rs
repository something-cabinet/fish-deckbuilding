use crate::core::cards::CardDef;

#[derive(Debug, Clone)]
pub struct Hand {
    pub cards: Vec<CardDef>,
    pub max_size: i32,
}

impl Hand {
    pub fn new(max_size: i32) -> Self {
        Self { cards: Vec::new(), max_size }
    }

    pub fn add(&mut self, card: CardDef) {
        if (self.cards.len() as i32) < self.max_size {
            self.cards.push(card);
        }
    }

    pub fn remove(&mut self, index: usize) -> Option<CardDef> {
        if index < self.cards.len() { Some(self.cards.remove(index)) } else { None }
    }

pub fn len(&self) -> usize { self.cards.len() }
}

impl Default for Hand {
    fn default() -> Self { Self::new(5) }
}

fn fisher_yates_shuffle<T>(items: &mut [T], seed: u64) {
    let mut state = seed;
    let len = items.len();
    if len <= 1 { return; }
    for i in (1..len).rev() {
        state = state.wrapping_mul(6364136223846793005).wrapping_add(1442695040888963407);
        let j = (state >> 33) as usize % (i + 1);
        items.swap(i, j);
    }
}

#[derive(Debug, Clone)]
pub struct Deck {
    pub cards: Vec<CardDef>,
}

impl Deck {
    pub fn new(cards: Vec<CardDef>) -> Self {
        Self { cards }
    }

    pub fn shuffle(&mut self, seed: u64) {
        fisher_yates_shuffle(&mut self.cards, seed);
    }

    pub fn draw(&mut self) -> Option<CardDef> {
        if self.cards.is_empty() { None } else { Some(self.cards.remove(0)) }
    }

    pub fn push(&mut self, card: CardDef) {
        self.cards.push(card);
    }

    pub fn len(&self) -> usize { self.cards.len() }
    pub fn is_empty(&self) -> bool { self.cards.is_empty() }
}

#[derive(Debug, Clone)]
pub struct Graveyard {
    pub cards: Vec<CardDef>,
}

impl Graveyard {
    pub fn new() -> Self { Self { cards: Vec::new() } }

    pub fn add(&mut self, card: CardDef) { self.cards.push(card); }

    pub fn drain(&mut self) -> Vec<CardDef> { std::mem::take(&mut self.cards) }

    pub fn len(&self) -> usize { self.cards.len() }
}

impl Default for Graveyard {
    fn default() -> Self { Self::new() }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::core::cards::Rarity;

    fn dummy_card(id: &'static str) -> CardDef {
        CardDef::new(id, "Test", 1, vec![], Rarity::Common)
    }

    #[test]
    fn hand_adds_up_to_max() {
        let mut h = Hand::new(3);
        h.add(dummy_card("a"));
        h.add(dummy_card("b"));
        h.add(dummy_card("c"));
        h.add(dummy_card("d"));
        assert_eq!(h.len(), 3);
    }

    #[test]
    fn hand_remove_returns_card() {
        let mut h = Hand::new(5);
        h.add(dummy_card("a"));
        h.add(dummy_card("b"));
        assert_eq!(h.remove(0).unwrap().id, "a");
        assert_eq!(h.len(), 1);
    }

    #[test]
    fn deck_draw_returns_first_card() {
        let mut d = Deck::new(vec![dummy_card("a"), dummy_card("b")]);
        assert_eq!(d.draw().unwrap().id, "a");
        assert_eq!(d.len(), 1);
    }

    #[test]
    fn deck_draw_empty_returns_none() {
        let mut d = Deck::new(vec![]);
        assert!(d.draw().is_none());
    }

    #[test]
    fn deck_shuffle_changes_order() {
        let cards = vec![
            dummy_card("a"), dummy_card("b"), dummy_card("c"),
            dummy_card("d"), dummy_card("e"),
        ];
        let mut d = Deck::new(cards.clone());
        d.shuffle(42);
        let order_before: Vec<&str> = cards.iter().map(|c| c.id).collect();
        let order_after: Vec<&str> = d.cards.iter().map(|c| c.id).collect();
        assert_ne!(order_before, order_after);
    }

    #[test]
    fn shuffle_is_deterministic() {
        let cards = vec![
            dummy_card("a"), dummy_card("b"), dummy_card("c"),
            dummy_card("d"), dummy_card("e"),
        ];
        let mut d1 = Deck::new(cards.clone());
        let mut d2 = Deck::new(cards.clone());
        d1.shuffle(42);
        d2.shuffle(42);
        let order1: Vec<&str> = d1.cards.iter().map(|c| c.id).collect();
        let order2: Vec<&str> = d2.cards.iter().map(|c| c.id).collect();
        assert_eq!(order1, order2);
    }

    #[test]
    fn graveyard_drain_empties() {
        let mut g = Graveyard::new();
        g.add(dummy_card("a"));
        g.add(dummy_card("b"));
        assert_eq!(g.drain().len(), 2);
        assert_eq!(g.len(), 0);
    }

    #[test]
    fn deck_push_adds_to_end() {
        let mut d = Deck::new(vec![dummy_card("a")]);
        d.push(dummy_card("b"));
        assert_eq!(d.len(), 2);
    }
}