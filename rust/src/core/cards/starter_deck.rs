use crate::core::cards::model::*;
use crate::core::cards::Rarity::*;

pub fn starter_deck() -> Vec<CardDef> {
    let mut deck = Vec::with_capacity(26);
    for card in all_starter_cards() {
        deck.push(card.clone());
        deck.push(card.clone());
    }
    deck
}

pub fn all_starter_cards() -> Vec<CardDef> {
    vec![
        CardDef::new("fin_slash", "Fin Slash", 1, vec![
            CardEffect { effect: Effect::Damage(3), range: 1, aoe: 1 },
        ], Common),
        CardDef::new("splash", "Splash", 0, vec![
            CardEffect { effect: Effect::Damage(1), range: 1, aoe: 1 },
        ], Common),
        CardDef::new("bubble_shield", "Bubble Shield", 1, vec![
            CardEffect { effect: Effect::Shield(4), range: 0, aoe: 1 },
        ], Common),
        CardDef::new("quick_swim", "Quick Swim", 1, vec![
            CardEffect { effect: Effect::DrawCards(2), range: 0, aoe: 1 },
        ], Common),
        CardDef::new("deep_breath", "Deep Breath", 0, vec![
            CardEffect { effect: Effect::Heal(2), range: 0, aoe: 1 },
        ], Common),
        CardDef::new("scale_throw", "Scale Throw", 1, vec![
            CardEffect { effect: Effect::Damage(2), range: 3, aoe: 1 },
        ], Common),
        CardDef::new("tail_slap", "Tail Slap", 2, vec![
            CardEffect { effect: Effect::Damage(5), range: 1, aoe: 1 },
        ], Uncommon),
        CardDef::new("ink_jet", "Ink Jet", 1, vec![
            CardEffect { effect: Effect::Damage(2), range: 2, aoe: 2 },
            CardEffect { effect: Effect::ApplyBuff(BuffType::Blind, 1), range: 2, aoe: 2 },
        ], Uncommon),
        CardDef::new("coral_shell", "Coral Shell", 2, vec![
            CardEffect { effect: Effect::Shield(6), range: 0, aoe: 1 },
        ], Uncommon),
        CardDef::new("healing_rain", "Healing Rain", 2, vec![
            CardEffect { effect: Effect::Heal(3), range: 2, aoe: 2 },
        ], Uncommon),
        CardDef::new("tidal_wave", "Tidal Wave", 3, vec![
            CardEffect { effect: Effect::Damage(4), range: 3, aoe: 3 },
        ], Rare),
        CardDef::new("sirens_call", "Siren's Call", 1, vec![
            CardEffect { effect: Effect::ApplyBuff(BuffType::Strengthen, 2), range: 0, aoe: 1 },
        ], Rare),
        CardDef::new("desperate_strike", "Desperate Strike", 3, vec![
            CardEffect { effect: Effect::Damage(8), range: 1, aoe: 1 },
        ], Rare),
    ]
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn starter_deck_has_26_cards() {
        let deck = starter_deck();
        assert_eq!(deck.len(), 26);
    }

    #[test]
    fn each_card_has_valid_id() {
        for card in all_starter_cards() {
            assert!(!card.id.is_empty());
            assert!(!card.name.is_empty());
            assert!(card.cost >= 0 && card.cost <= 9);
            assert!(!card.effects.is_empty());
        }
    }
}