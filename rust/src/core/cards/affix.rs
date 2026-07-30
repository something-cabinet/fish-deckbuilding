use crate::core::cards::{CardDef, Effect, Rarity, CardEffect};

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum AffixType {
    Offense,
    Defense,
    Utility,
}

impl Rarity {
    pub fn max_affixes(&self) -> usize {
        match self {
            Rarity::Common => 0,
            Rarity::Uncommon => 1,
            Rarity::Rare => 2,
            Rarity::Legendary => 3,
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Affix {
    pub affix_type: AffixType,
    pub description: &'static str,
    pub target_effect_idx: usize,
    pub damage_bonus: i32,
    pub heal_bonus: i32,
    pub shield_bonus: i32,
    pub draw_bonus: i32,
}

pub fn affix_pool() -> Vec<Affix> {
    vec![
        Affix { affix_type: AffixType::Offense, description: "+3 ATK", target_effect_idx: 0, damage_bonus: 3, heal_bonus: 0, shield_bonus: 0, draw_bonus: 0 },
        Affix { affix_type: AffixType::Offense, description: "+5 ATK", target_effect_idx: 0, damage_bonus: 5, heal_bonus: 0, shield_bonus: 0, draw_bonus: 0 },
        Affix { affix_type: AffixType::Offense, description: "+2 ATK", target_effect_idx: 0, damage_bonus: 2, heal_bonus: 0, shield_bonus: 0, draw_bonus: 0 },
        Affix { affix_type: AffixType::Defense, description: "+4 Shield", target_effect_idx: 0, damage_bonus: 0, heal_bonus: 0, shield_bonus: 4, draw_bonus: 0 },
        Affix { affix_type: AffixType::Defense, description: "+6 Shield", target_effect_idx: 0, damage_bonus: 0, heal_bonus: 0, shield_bonus: 6, draw_bonus: 0 },
        Affix { affix_type: AffixType::Defense, description: "+2 Shield", target_effect_idx: 0, damage_bonus: 0, heal_bonus: 0, shield_bonus: 2, draw_bonus: 0 },
        Affix { affix_type: AffixType::Utility, description: "+3 Heal", target_effect_idx: 0, damage_bonus: 0, heal_bonus: 3, shield_bonus: 0, draw_bonus: 0 },
        Affix { affix_type: AffixType::Utility, description: "+5 Heal", target_effect_idx: 0, damage_bonus: 0, heal_bonus: 5, shield_bonus: 0, draw_bonus: 0 },
        Affix { affix_type: AffixType::Utility, description: "+2 Draw", target_effect_idx: 0, damage_bonus: 0, heal_bonus: 0, shield_bonus: 0, draw_bonus: 2 },
    ]
}

pub struct SeededRng {
    state: u64,
}

impl SeededRng {
    pub fn new(seed: u64) -> Self {
        Self { state: seed }
    }

    pub fn next_u64(&mut self) -> u64 {
        self.state = self.state.wrapping_mul(6364136223846793005).wrapping_add(1442695040888963407);
        self.state
    }

    pub fn range(&mut self, max: usize) -> usize {
        (self.next_u64() >> 33) as usize % max
    }
}

fn effect_to_affix_type(card: &CardDef) -> AffixType {
    card.effects.first().map(|e| match e.effect {
        Effect::Damage(_) => AffixType::Offense,
        Effect::Shield(_) => AffixType::Defense,
        Effect::Heal(_) | Effect::DrawCards(_) | Effect::ApplyBuff(_, _) => AffixType::Utility,
    }).unwrap_or(AffixType::Utility)
}

fn generate_one_affix(card: &CardDef, rng: &mut SeededRng, pool: &mut Vec<Affix>) -> Affix {
    let base_type = effect_to_affix_type(card);
    let desired_type = if rng.range(100) < 80 {
        base_type
    } else {
        match rng.range(3) {
            0 => AffixType::Offense,
            1 => AffixType::Defense,
            _ => AffixType::Utility,
        }
    };

    let idx = pool.iter().position(|a| a.affix_type == desired_type).unwrap_or(0);
    pool.remove(idx)
}

fn shuffle_pool(rng: &mut SeededRng, pool: &mut [Affix]) {
    let len = pool.len();
    for i in (1..len).rev() {
        let j = rng.range(i + 1);
        pool.swap(i, j);
    }
}

#[allow(dead_code)]
pub fn generate_affixes(card: &CardDef, seed: u64) -> Vec<Affix> {
    let count = card.rarity.max_affixes();
    if count == 0 { return Vec::new(); }

    let mut rng = SeededRng::new(seed);
    let mut pool = affix_pool();
    shuffle_pool(&mut rng, &mut pool);

    let mut result = Vec::with_capacity(count);
    for _ in 0..count {
        if pool.is_empty() { break; }
        result.push(generate_one_affix(card, &mut rng, &mut pool));
    }
    result
}

pub fn enchanter_reroll(card: &CardDef, affix_idx: usize, seed: u64) -> CardDef {
    let mut new_card = card.clone();
    if affix_idx >= new_card.affixes.len() { return new_card; }

    let mut rng = SeededRng::new(seed);
    let mut pool = affix_pool();
    for existing in &new_card.affixes {
        if let Some(pos) = pool.iter().position(|a| a.description == existing.description) {
            pool.remove(pos);
        }
    }
    shuffle_pool(&mut rng, &mut pool);
    if pool.is_empty() { return new_card; }

    new_card.affixes[affix_idx] = generate_one_affix(card, &mut rng, &mut pool);
    new_card
}

pub fn gambler_add_slot(card: &CardDef, seed: u64) -> CardDef {
    let mut new_card = card.clone();
    if new_card.affixes.len() >= new_card.rarity.max_affixes() { return new_card; }

    let mut rng = SeededRng::new(seed);
    let mut pool = affix_pool();
    for existing in &new_card.affixes {
        if let Some(pos) = pool.iter().position(|a| a.description == existing.description) {
            pool.remove(pos);
        }
    }
    shuffle_pool(&mut rng, &mut pool);
    if pool.is_empty() { return new_card; }

    new_card.affixes.push(generate_one_affix(card, &mut rng, &mut pool));
    new_card
}

#[allow(dead_code)]
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum CorruptOutcome {
    NoChange,
    Boost,
    Weaken,
    RerollAffixes,
    AddImplicit,
    AddImplicitAndBoost,
}

#[allow(dead_code)]
fn implicit_affix_pool() -> Vec<Affix> {
    vec![
        Affix { affix_type: AffixType::Utility, description: "Cannot be blocked", target_effect_idx: 0, damage_bonus: 0, heal_bonus: 0, shield_bonus: 0, draw_bonus: 0 },
        Affix { affix_type: AffixType::Offense, description: "Double strike", target_effect_idx: 0, damage_bonus: 5, heal_bonus: 0, shield_bonus: 0, draw_bonus: 0 },
        Affix { affix_type: AffixType::Utility, description: "Siphon", target_effect_idx: 0, damage_bonus: 0, heal_bonus: 3, shield_bonus: 0, draw_bonus: 0 },
    ]
}

#[allow(dead_code)]
pub fn corrupt(card: &CardDef, seed: u64) -> (CardDef, CorruptOutcome) {
    let mut new_card = card.clone();
    new_card.corrupted = true;

    let mut rng = SeededRng::new(seed);
    let roll = rng.range(100);

    let outcome = if roll < 20 {
        CorruptOutcome::NoChange
    } else if roll < 35 {
        CorruptOutcome::Boost
    } else if roll < 45 {
        CorruptOutcome::Weaken
    } else if roll < 70 {
        CorruptOutcome::RerollAffixes
    } else if roll < 90 {
        CorruptOutcome::AddImplicit
    } else {
        CorruptOutcome::AddImplicitAndBoost
    };

    match outcome {
        CorruptOutcome::NoChange => {}
        CorruptOutcome::Boost => {
            let pct = (25 + rng.range(26)) as i32;
            for affix in &mut new_card.affixes {
                affix.damage_bonus = (affix.damage_bonus * (100 + pct)) / 100;
                affix.heal_bonus = (affix.heal_bonus * (100 + pct)) / 100;
                affix.shield_bonus = (affix.shield_bonus * (100 + pct)) / 100;
                affix.draw_bonus = (affix.draw_bonus * (100 + pct)) / 100;
            }
        }
        CorruptOutcome::Weaken => {
            let pct = (25 + rng.range(26)) as i32;
            for affix in &mut new_card.affixes {
                affix.damage_bonus = (affix.damage_bonus * (100 - pct)) / 100;
                affix.heal_bonus = (affix.heal_bonus * (100 - pct)) / 100;
                affix.shield_bonus = (affix.shield_bonus * (100 - pct)) / 100;
                affix.draw_bonus = (affix.draw_bonus * (100 - pct)) / 100;
            }
        }
        CorruptOutcome::RerollAffixes => {
            let mut pool = affix_pool();
            shuffle_pool(&mut rng, &mut pool);
            new_card.affixes.clear();
            for _ in 0..new_card.rarity.max_affixes() {
                if pool.is_empty() { break; }
                new_card.affixes.push(generate_one_affix(&new_card, &mut rng, &mut pool));
            }
        }
        CorruptOutcome::AddImplicit => {
            let implicits = implicit_affix_pool();
            let idx = rng.range(implicits.len());
            new_card.implicit_affix = Some(implicits[idx].clone());
        }
        CorruptOutcome::AddImplicitAndBoost => {
            let implicits = implicit_affix_pool();
            let idx = rng.range(implicits.len());
            new_card.implicit_affix = Some(implicits[idx].clone());
            if !new_card.affixes.is_empty() {
                let boost_idx = rng.range(new_card.affixes.len());
                let pct = (25 + rng.range(26)) as i32;
                let affix = &mut new_card.affixes[boost_idx];
                affix.damage_bonus = (affix.damage_bonus * (100 + pct)) / 100;
                affix.heal_bonus = (affix.heal_bonus * (100 + pct)) / 100;
                affix.shield_bonus = (affix.shield_bonus * (100 + pct)) / 100;
                affix.draw_bonus = (affix.draw_bonus * (100 + pct)) / 100;
            }
        }
    }

    (new_card, outcome)
}

#[allow(dead_code)]
pub fn apply_affixes_to_effects(card: &CardDef) -> Vec<CardEffect> {
    card.effects.iter().enumerate().map(|(i, ce)| {
        let mut dmg = 0;
        let mut heal = 0;
        let mut shield = 0;
        let mut draw = 0;

        for affix in &card.affixes {
            if affix.target_effect_idx == i {
                dmg += affix.damage_bonus;
                heal += affix.heal_bonus;
                shield += affix.shield_bonus;
                draw += affix.draw_bonus;
            }
        }
        if let Some(ref affix) = card.implicit_affix {
            if affix.target_effect_idx == i {
                dmg += affix.damage_bonus;
                heal += affix.heal_bonus;
                shield += affix.shield_bonus;
                draw += affix.draw_bonus;
            }
        }

        let new_effect = match ce.effect {
            Effect::Damage(v) => Effect::Damage(v + dmg),
            Effect::Heal(v) => Effect::Heal(v + heal),
            Effect::Shield(v) => Effect::Shield(v + shield),
            Effect::DrawCards(v) => Effect::DrawCards(v + draw),
            Effect::ApplyBuff(bt, v) => Effect::ApplyBuff(bt, v),
        };

        CardEffect { effect: new_effect, range: ce.range, aoe: ce.aoe }
    }).collect()
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::core::cards::{CardEffect, Effect, Rarity, CardDef};

    fn test_card() -> CardDef {
        CardDef::new("test", "Test", 1, vec![
            CardEffect { effect: Effect::Damage(3), range: 1, aoe: 1 },
        ], Rarity::Rare)
    }

    fn test_card_with_affixes() -> CardDef {
        test_card().with_affixes(vec![
            Affix { affix_type: AffixType::Offense, description: "+5 ATK", target_effect_idx: 0, damage_bonus: 5, heal_bonus: 0, shield_bonus: 0, draw_bonus: 0 },
        ])
    }

    #[test]
    fn rarity_max_slots() {
        assert_eq!(Rarity::Common.max_affixes(), 0);
        assert_eq!(Rarity::Uncommon.max_affixes(), 1);
        assert_eq!(Rarity::Rare.max_affixes(), 2);
        assert_eq!(Rarity::Legendary.max_affixes(), 3);
    }

    #[test]
    fn generate_affixes_common_returns_empty() {
        let card = CardDef::new("c", "C", 0, vec![], Rarity::Common);
        let affixes = generate_affixes(&card, 42);
        assert!(affixes.is_empty());
    }

    #[test]
    fn generate_affixes_uncommon_returns_one() {
        let card = CardDef::new("u", "U", 1, vec![
            CardEffect { effect: Effect::Damage(2), range: 1, aoe: 1 },
        ], Rarity::Uncommon);
        let affixes = generate_affixes(&card, 42);
        assert_eq!(affixes.len(), 1);
    }

    #[test]
    fn generate_affixes_deterministic() {
        let card = CardDef::new("d", "D", 1, vec![
            CardEffect { effect: Effect::Damage(2), range: 1, aoe: 1 },
        ], Rarity::Rare);
        let a1 = generate_affixes(&card, 42);
        let a2 = generate_affixes(&card, 42);
        assert_eq!(a1, a2);
    }

    #[test]
    fn enchanter_reroll_replaces_affix() {
        let card = test_card_with_affixes();
        let original_desc = card.affixes[0].description;
        let result = enchanter_reroll(&card, 0, 99);
        assert_eq!(result.affixes.len(), 1);
        assert_ne!(result.affixes[0].description, original_desc);
    }

    #[test]
    fn gambler_add_slot_increases_count() {
        let card = CardDef::new("g", "G", 1, vec![
            CardEffect { effect: Effect::Shield(4), range: 0, aoe: 1 },
        ], Rarity::Rare);
        let result = gambler_add_slot(&card, 42);
        assert_eq!(result.affixes.len(), 1);
    }

    #[test]
    fn gambler_add_slot_fails_at_max() {
        let card = CardDef::new("g", "G", 1, vec![
            CardEffect { effect: Effect::Damage(2), range: 1, aoe: 1 },
        ], Rarity::Common);
        let result = gambler_add_slot(&card, 42);
        assert_eq!(result.affixes.len(), 0);
    }

    #[test]
    fn corrupt_sets_corrupted() {
        let card = test_card();
        let (new_card, _) = corrupt(&card, 42);
        assert!(new_card.corrupted);
    }

    #[test]
    fn corrupt_boost_increases_values() {
        let card = test_card_with_affixes();
        let orig_val = card.affixes[0].damage_bonus;
        for seed in 0..200 {
            let (new_card, outcome) = corrupt(&card, seed);
            if outcome == CorruptOutcome::Boost {
                assert!(new_card.affixes[0].damage_bonus > orig_val);
                return;
            }
        }
        panic!("Boost outcome not found in 200 seeds");
    }

    #[test]
    fn corrupt_weaken_decreases_values() {
        let card = test_card_with_affixes();
        let orig_val = card.affixes[0].damage_bonus;
        for seed in 0..200 {
            let (new_card, outcome) = corrupt(&card, seed);
            if outcome == CorruptOutcome::Weaken {
                assert!(new_card.affixes[0].damage_bonus < orig_val);
                return;
            }
        }
        panic!("Weaken outcome not found in 200 seeds");
    }

    #[test]
    fn corrupt_implicit_added() {
        let card = test_card();
        for seed in 0..200 {
            let (new_card, outcome) = corrupt(&card, seed);
            if outcome == CorruptOutcome::AddImplicit {
                assert!(new_card.implicit_affix.is_some());
                return;
            }
        }
        panic!("AddImplicit outcome not found in 200 seeds");
    }

    #[test]
    fn corrupt_no_change_preserves_affixes() {
        let card = test_card_with_affixes();
        for seed in 0..200 {
            let (new_card, outcome) = corrupt(&card, seed);
            if outcome == CorruptOutcome::NoChange {
                assert_eq!(new_card.affixes, card.affixes);
                return;
            }
        }
        panic!("NoChange outcome not found in 200 seeds");
    }

    #[test]
    fn corrupt_reroll_replaces_all() {
        let card = test_card_with_affixes();
        for seed in 0..200 {
            let (new_card, outcome) = corrupt(&card, seed);
            if outcome == CorruptOutcome::RerollAffixes {
                assert_ne!(new_card.affixes, card.affixes);
                return;
            }
        }
        panic!("RerollAffixes outcome not found in 200 seeds");
    }

    #[test]
    fn apply_affixes_modifies_damage() {
        let card = test_card_with_affixes();
        let effects = apply_affixes_to_effects(&card);
        assert_eq!(effects.len(), 1);
        match &effects[0].effect {
            Effect::Damage(v) => assert_eq!(*v, 8),
            _ => panic!("Expected Damage"),
        }
    }
}