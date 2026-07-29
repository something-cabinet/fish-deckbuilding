use crate::core::cards::{CardDef, Rarity, all_starter_cards};

const BASE_GOLD: i32 = 10;
const BOSS_GOLD: i32 = 30;

fn seeded_shuffle<T: Clone>(items: &[T], seed: u64) -> Vec<T> {
    let mut result: Vec<T> = items.to_vec();
    let mut state = seed;
    let len = result.len();
    if len <= 1 { return result; }
    for i in (1..len).rev() {
        state = state.wrapping_mul(6364136223846793005).wrapping_add(1442695040888963407);
        let j = (state >> 33) as usize % (i + 1);
        result.swap(i, j);
    }
    result
}

pub fn generate_rewards(seed: u64, is_boss: bool) -> (Vec<CardDef>, i32) {
    let gold = if is_boss { BOSS_GOLD } else { BASE_GOLD };
    let pool = all_starter_cards();
    let filtered: Vec<CardDef> = if is_boss {
        pool.into_iter().filter(|c| c.rarity == Rarity::Rare || c.rarity == Rarity::Legendary).collect()
    } else {
        pool
    };
    let shuffled = seeded_shuffle(&filtered, seed);
    let choices: Vec<CardDef> = shuffled.into_iter().take(3).collect();
    (choices, gold)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn normal_reward_has_3_choices() {
        let (cards, gold) = generate_rewards(42, false);
        assert_eq!(cards.len(), 3);
        assert_eq!(gold, 10);
    }

    #[test]
    fn boss_reward_has_more_gold() {
        let (_, gold) = generate_rewards(42, true);
        assert_eq!(gold, 30);
    }

    #[test]
    fn boss_reward_only_rare_plus() {
        let (cards, _) = generate_rewards(42, true);
        for card in &cards {
            assert!(card.rarity == Rarity::Rare || card.rarity == Rarity::Legendary);
        }
    }

    #[test]
    fn reward_is_deterministic() {
        let (c1, _) = generate_rewards(42, false);
        let (c2, _) = generate_rewards(42, false);
        assert_eq!(c1.len(), c2.len());
        for (a, b) in c1.iter().zip(c2.iter()) {
            assert_eq!(a.id, b.id);
        }
    }
}