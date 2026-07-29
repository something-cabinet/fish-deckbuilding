#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Rarity {
    Common,
    Uncommon,
    Rare,
    Legendary,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum BuffType {
    Blind,
    Strengthen,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum Effect {
    Damage(i32),
    Heal(i32),
    Shield(i32),
    DrawCards(i32),
    ApplyBuff(BuffType, i32),
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct CardEffect {
    pub effect: Effect,
    pub range: i32,
    pub aoe: i32,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct CardDef {
    pub id: &'static str,
    pub name: &'static str,
    pub cost: i32,
    pub effects: Vec<CardEffect>,
    pub rarity: Rarity,
}

impl CardDef {
    pub fn new(
        id: &'static str,
        name: &'static str,
        cost: i32,
        effects: Vec<CardEffect>,
        rarity: Rarity,
    ) -> Self {
        Self { id, name, cost, effects, rarity }
    }
}

pub fn cross_aoe(center: (i32, i32), radius: i32) -> Vec<(i32, i32)> {
    let mut tiles = vec![center];
    for d in 1..=radius.saturating_sub(1) {
        tiles.push((center.0 + d, center.1));
        tiles.push((center.0 - d, center.1));
        tiles.push((center.0, center.1 + d));
        tiles.push((center.0, center.1 - d));
    }
    tiles
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn aoe_1_is_center_only() {
        let tiles = cross_aoe((3, 2), 1);
        assert_eq!(tiles, vec![(3, 2)]);
    }

    #[test]
    fn aoe_2_is_center_plus_cardinal() {
        let mut tiles = cross_aoe((3, 2), 2);
        tiles.sort();
        let mut expected = vec![(3, 2), (4, 2), (2, 2), (3, 3), (3, 1)];
        expected.sort();
        assert_eq!(tiles, expected);
    }

    #[test]
    fn aoe_3_is_cross_radius_2() {
        let mut tiles = cross_aoe((3, 2), 3);
        tiles.sort();
        let mut expected = vec![
            (3, 2), (4, 2), (2, 2), (3, 3), (3, 1),
            (5, 2), (1, 2), (3, 4), (3, 0),
        ];
        expected.sort();
        assert_eq!(tiles, expected);
    }
}