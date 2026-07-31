use serde::{Deserialize, Serialize};
use crate::core::grid::Range;
use crate::core::cards::targeting::TargetFilter;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum Rarity {
    Common,
    Uncommon,
    Rare,
    #[allow(dead_code)]
    Legendary,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum BuffType {
    Blind,
    Strengthen,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum Effect {
    Damage(i32),
    Heal(i32),
    Shield(i32),
    DrawCards(i32),
    ApplyBuff(BuffType, i32),
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct CardEffect {
    pub effect: Effect,
    pub range: Range,
    pub target: TargetFilter,
    pub affect_pattern: Vec<(i32, i32)>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct CardDef {
    pub id: String,
    pub name: String,
    pub cost: i32,
    pub effects: Vec<CardEffect>,
    pub rarity: Rarity,
    pub affixes: Vec<super::affix::Affix>,
    pub corrupted: bool,
    pub implicit_affix: Option<super::affix::Affix>,
}

impl CardDef {
    pub fn new(
        id: impl Into<String>,
        name: impl Into<String>,
        cost: i32,
        effects: Vec<CardEffect>,
        rarity: Rarity,
    ) -> Self {
        Self { id: id.into(), name: name.into(), cost, effects, rarity, affixes: Vec::new(), corrupted: false, implicit_affix: None }
    }

    #[allow(dead_code)]
    pub fn with_affixes(mut self, affixes: Vec<super::affix::Affix>) -> Self {
        self.affixes = affixes;
        self
    }

    #[allow(dead_code)]
    pub fn with_corrupted(mut self, corrupted: bool) -> Self {
        self.corrupted = corrupted;
        self
    }

    #[allow(dead_code)]
    pub fn with_implicit(mut self, implicit: Option<super::affix::Affix>) -> Self {
        self.implicit_affix = implicit;
        self
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::core::grid::Range;
    use crate::core::cards::targeting::TargetFilter;

    #[test]
    fn card_effect_uses_range_enum() {
        let effect = CardEffect {
            effect: Effect::Damage(3),
            range: Range::Melee,
            target: TargetFilter::EnemyUnit,
            affect_pattern: vec![],
        };
        assert_eq!(effect.range, Range::Melee);
        assert_eq!(effect.target, TargetFilter::EnemyUnit);
    }

    #[test]
    fn ranged_effect_uses_ranged() {
        let effect = CardEffect {
            effect: Effect::Damage(2),
            range: Range::Ranged,
            target: TargetFilter::EnemyUnit,
            affect_pattern: vec![],
        };
        assert_eq!(effect.range, Range::Ranged);
    }
}