use crate::core::cards::model::*;
use crate::core::cards::targeting::{TargetFilter, patterns};
use crate::core::cards::Rarity::*;
use crate::core::grid::Range;

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
            CardEffect { effect: Effect::Damage(3), range: Range::Melee, target: TargetFilter::EnemyUnit, affect_pattern: vec![] },
        ], Common),
        CardDef::new("splash", "Splash", 0, vec![
            CardEffect { effect: Effect::Damage(1), range: Range::Melee, target: TargetFilter::EnemyUnit, affect_pattern: vec![] },
        ], Common),
        CardDef::new("bubble_shield", "Bubble Shield", 1, vec![
            CardEffect { effect: Effect::Shield(4), range: Range::Melee, target: TargetFilter::Self_, affect_pattern: vec![] },
        ], Common),
        CardDef::new("quick_swim", "Quick Swim", 1, vec![
            CardEffect { effect: Effect::DrawCards(2), range: Range::Melee, target: TargetFilter::Self_, affect_pattern: vec![] },
        ], Common),
        CardDef::new("deep_breath", "Deep Breath", 0, vec![
            CardEffect { effect: Effect::Heal(2), range: Range::Melee, target: TargetFilter::Self_, affect_pattern: vec![] },
        ], Common),
        CardDef::new("scale_throw", "Scale Throw", 1, vec![
            CardEffect { effect: Effect::Damage(2), range: Range::Ranged, target: TargetFilter::EnemyUnit, affect_pattern: vec![] },
        ], Common),
        CardDef::new("tail_slap", "Tail Slap", 2, vec![
            CardEffect { effect: Effect::Damage(5), range: Range::Melee, target: TargetFilter::EnemyUnit, affect_pattern: vec![] },
        ], Uncommon),
        CardDef::new("ink_jet", "Ink Jet", 1, vec![
            CardEffect { effect: Effect::Damage(2), range: Range::Ranged, target: TargetFilter::AnyTile, affect_pattern: patterns::CROSS.to_vec() },
            CardEffect { effect: Effect::ApplyBuff(BuffType::Blind, 1), range: Range::Ranged, target: TargetFilter::AnyTile, affect_pattern: patterns::CROSS.to_vec() },
        ], Uncommon),
        CardDef::new("coral_shell", "Coral Shell", 2, vec![
            CardEffect { effect: Effect::Shield(6), range: Range::Melee, target: TargetFilter::Self_, affect_pattern: vec![] },
        ], Uncommon),
        CardDef::new("healing_rain", "Healing Rain", 2, vec![
            CardEffect { effect: Effect::Heal(3), range: Range::Ranged, target: TargetFilter::AllyUnit, affect_pattern: patterns::CROSS.to_vec() },
        ], Uncommon),
        CardDef::new("tidal_wave", "Tidal Wave", 3, vec![
            CardEffect { effect: Effect::Damage(4), range: Range::Ranged, target: TargetFilter::AnyTile, affect_pattern: patterns::SQUARE_3X3.to_vec() },
        ], Rare),
        CardDef::new("sirens_call", "Siren's Call", 1, vec![
            CardEffect { effect: Effect::ApplyBuff(BuffType::Strengthen, 2), range: Range::Melee, target: TargetFilter::Self_, affect_pattern: vec![] },
        ], Rare),
        CardDef::new("desperate_strike", "Desperate Strike", 3, vec![
            CardEffect { effect: Effect::Damage(8), range: Range::Melee, target: TargetFilter::EnemyUnit, affect_pattern: vec![] },
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