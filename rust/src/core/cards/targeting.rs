use serde::{Deserialize, Serialize};
use crate::core::cards::model::CardEffect;
use crate::core::grid::{Faction, GridState, Range};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum TargetFilter {
    EnemyUnit,
    AllyUnit,
    #[allow(dead_code, reason = "Public API — used by Godot bridge")]
    AnyUnit,
    #[allow(dead_code, reason = "Public API — used by Godot bridge")]
    EmptyTile,
    AnyTile,
    Self_,
}

/// Returns all valid target positions for this effect given the caster position, grid, and faction.
///
/// This is the SINGLE source of truth for both UI overlay rendering and play validation.
/// It first filters by range (Melee = Chebyshev distance ≤1, Ranged = whole board),
/// then by target filter (enemy unit, ally unit, any tile, etc.),
/// then edge-crops for AoE patterns (ensuring the full pattern fits on the board for tile-based targets).
#[allow(dead_code, reason = "Public API — used by Godot bridge for UI overlay + play validation")]
pub fn valid_targets(
    effect: &CardEffect,
    caster: (i32, i32),
    grid: &GridState,
    caster_faction: Faction,
) -> Vec<(i32, i32)> {
    // Stage 1: Range filter — determine candidate tiles based on range type
    let candidates: Vec<(i32, i32)> = match effect.range {
        Range::Melee => {
            let mut tiles = Vec::with_capacity(9);
            for dx in -1..=1 {
                for dy in -1..=1 {
                    let pos = (caster.0 + dx, caster.1 + dy);
                    if grid.in_bounds(pos) {
                        tiles.push(pos);
                    }
                }
            }
            tiles
        }
        Range::Ranged => {
            let mut tiles = Vec::with_capacity((grid.width * grid.height) as usize);
            for x in 0..grid.width {
                for y in 0..grid.height {
                    tiles.push((x, y));
                }
            }
            tiles
        }
    };

    // Stage 2: Target filter — narrow down candidates by what's on each tile
    let filtered: Vec<(i32, i32)> = match effect.target {
        TargetFilter::EnemyUnit => candidates
            .into_iter()
            .filter(|pos| {
                grid.unit_at(*pos)
                    .is_some_and(|u| u.faction != caster_faction)
            })
            .collect(),
        TargetFilter::AllyUnit => candidates
            .into_iter()
            .filter(|pos| {
                grid.unit_at(*pos)
                    .is_some_and(|u| u.faction == caster_faction)
            })
            .collect(),
        TargetFilter::AnyUnit => candidates
            .into_iter()
            .filter(|pos| grid.unit_at(*pos).is_some())
            .collect(),
        TargetFilter::EmptyTile => candidates
            .into_iter()
            .filter(|pos| grid.unit_at(*pos).is_none())
            .collect(),
        TargetFilter::AnyTile => candidates,
        TargetFilter::Self_ => candidates
            .into_iter()
            .filter(|pos| *pos == caster)
            .collect(),
    };

    // Stage 3: Edge-crop — ensure full AoE pattern fits on board
    // Only for tile-based targets (AnyTile, EmptyTile) where player freely picks any position.
    if !effect.affect_pattern.is_empty()
        && matches!(effect.target, TargetFilter::AnyTile | TargetFilter::EmptyTile)
    {
        filtered
            .into_iter()
            .filter(|pos| {
                effect
                    .affect_pattern
                    .iter()
                    .all(|(dx, dy)| grid.in_bounds((pos.0 + dx, pos.1 + dy)))
            })
            .collect()
    } else {
        filtered
    }
}

/// Predefined offset patterns for area-of-effect.
pub mod patterns {
    /// Single tile (no extra tiles beyond the center).
    #[allow(dead_code)]
    pub const SINGLE: &[(i32, i32)] = &[];
    /// Cross shape (cardinal neighbors).
    pub const CROSS: &[(i32, i32)] = &[(1, 0), (-1, 0), (0, 1), (0, -1)];
    /// 3×3 square block centered on the target.
    #[allow(dead_code)]
    pub const SQUARE_3X3: &[(i32, i32)] = &[
        (-1, -1), (-1, 0), (-1, 1),
        (0, -1),  (0, 0),  (0, 1),
        (1, -1),  (1, 0),  (1, 1),
    ];
    /// 2×2 square block (top-left corner at target).
    #[allow(dead_code)]
    pub const SQUARE_2X2: &[(i32, i32)] = &[(0, 0), (0, 1), (1, 0), (1, 1)];
    /// Extended cross (two steps in each cardinal direction).
    #[allow(dead_code)]
    pub const CROSS_2: &[(i32, i32)] = &[
        (1, 0), (-1, 0), (0, 1), (0, -1),
        (2, 0), (-2, 0), (0, 2), (0, -2),
    ];
}

/// Applies an affect pattern (list of offsets) to a center tile.
///
/// Always includes the center tile, even if it is not in the pattern.
/// An empty pattern returns only the center tile.
pub fn apply_affect_pattern(center: (i32, i32), pattern: &[(i32, i32)]) -> Vec<(i32, i32)> {
    if pattern.is_empty() {
        return vec![center];
    }
    let mut tiles: Vec<(i32, i32)> = pattern
        .iter()
        .map(|offset| (center.0 + offset.0, center.1 + offset.1))
        .collect();
    if !tiles.contains(&center) {
        tiles.push(center);
    }
    tiles
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::core::cards::model::{CardEffect, Effect};
    use crate::core::grid::{Faction, GridState, GridUnit, Range};

    fn grid_with_hero_and_enemies() -> GridState {
        let mut g = GridState::new(9, 5);
        g.place_unit((0, 2), GridUnit::hero());
        g.place_unit((1, 2), GridUnit::enemy());
        g.place_unit((8, 0), GridUnit::enemy());
        g
    }

    #[test]
    fn valid_targets_melee_enemy_only_adjacent() {
        let grid = grid_with_hero_and_enemies();
        let effect = CardEffect {
            effect: Effect::Damage(3),
            range: Range::Melee,
            target: TargetFilter::EnemyUnit,
            affect_pattern: vec![],
        };
        let targets = valid_targets(&effect, (0, 2), &grid, Faction::Hero);
        // (1,2) is the adjacent enemy
        assert!(targets.contains(&(1, 2)));
        // (8,0) is a far enemy — NOT in melee range
        assert!(!targets.contains(&(8, 0)));
        assert_eq!(targets.len(), 1);
    }

    #[test]
    fn valid_targets_ranged_enemy_all_enemies() {
        let grid = grid_with_hero_and_enemies();
        let effect = CardEffect {
            effect: Effect::Damage(2),
            range: Range::Ranged,
            target: TargetFilter::EnemyUnit,
            affect_pattern: vec![],
        };
        let targets = valid_targets(&effect, (0, 2), &grid, Faction::Hero);
        assert!(targets.contains(&(1, 2)));
        assert!(targets.contains(&(8, 0))); // ranged can reach far enemy
        assert_eq!(targets.len(), 2);
    }

    #[test]
    fn valid_targets_self_only() {
        let mut grid = GridState::new(9, 5);
        grid.place_unit((3, 2), GridUnit::hero());

        let effect = CardEffect {
            effect: Effect::Shield(4),
            range: Range::Melee,
            target: TargetFilter::Self_,
            affect_pattern: vec![],
        };
        let targets = valid_targets(&effect, (3, 2), &grid, Faction::Hero);
        assert_eq!(targets, vec![(3, 2)]);
    }

    #[test]
    fn valid_targets_ally_unit() {
        let grid = grid_with_hero_and_enemies();
        let effect = CardEffect {
            effect: Effect::Heal(3),
            range: Range::Ranged,
            target: TargetFilter::AllyUnit,
            affect_pattern: vec![],
        };
        let targets = valid_targets(&effect, (0, 2), &grid, Faction::Hero);
        // Hero at (0,2) is the only ally
        assert_eq!(targets, vec![(0, 2)]);
    }

    #[test]
    fn valid_targets_any_tile_edge_cropped_for_pattern() {
        let grid = grid_with_hero_and_enemies();
        let effect = CardEffect {
            effect: Effect::Damage(4),
            range: Range::Ranged,
            target: TargetFilter::AnyTile,
            affect_pattern: patterns::CROSS.to_vec(),
        };
        let targets = valid_targets(&effect, (0, 2), &grid, Faction::Hero);
        // Many tiles should be valid
        assert!(targets.len() > 10);
        assert!(targets.contains(&(3, 2)));
        // (0,0) should be excluded — CROSS at (0,0) goes to (-1,0) which is off-board
        assert!(!targets.contains(&(0, 0)));
    }

    #[test]
    fn valid_targets_empty_tile() {
        let grid = grid_with_hero_and_enemies();
        let effect = CardEffect {
            effect: Effect::Damage(0),
            range: Range::Ranged,
            target: TargetFilter::EmptyTile,
            affect_pattern: vec![],
        };
        let targets = valid_targets(&effect, (0, 2), &grid, Faction::Hero);
        // Should include many empty tiles
        assert!(targets.contains(&(3, 3))); // some empty tile
        // Hero's tile is occupied
        assert!(!targets.contains(&(0, 2)));
        // Enemy tiles are occupied
        assert!(!targets.contains(&(1, 2)));
        assert!(!targets.contains(&(8, 0)));
    }

    #[test]
    fn valid_targets_melee_no_enemies_returns_empty() {
        let mut grid = GridState::new(9, 5);
        grid.place_unit((0, 2), GridUnit::hero());

        let effect = CardEffect {
            effect: Effect::Damage(3),
            range: Range::Melee,
            target: TargetFilter::EnemyUnit,
            affect_pattern: vec![],
        };
        let targets = valid_targets(&effect, (0, 2), &grid, Faction::Hero);
        assert!(targets.is_empty());
    }

    #[test]
    fn valid_targets_empty_tile_edge_cropped_for_pattern() {
        let mut grid = GridState::new(9, 5);
        grid.place_unit((3, 2), GridUnit::hero());

        let effect = CardEffect {
            effect: Effect::Damage(0),
            range: Range::Ranged,
            target: TargetFilter::EmptyTile,
            affect_pattern: patterns::CROSS.to_vec(),
        };
        let targets = valid_targets(&effect, (3, 2), &grid, Faction::Hero);
        // (0,0) should be excluded — CROSS would go off-board
        assert!(!targets.contains(&(0, 0)));
        // (3,3) should be valid — all CROSS tiles fit
        assert!(targets.contains(&(3, 3)));
        // Hero tile is occupied
        assert!(!targets.contains(&(3, 2)));
    }

    #[test]
    fn empty_pattern_returns_target() {
        let tiles = apply_affect_pattern((3, 2), &[]);
        assert_eq!(tiles, vec![(3, 2)]);
    }

    #[test]
    fn cross_plus_center() {
        let mut tiles = apply_affect_pattern((3, 2), patterns::CROSS);
        tiles.sort();
        let mut expected = vec![(3, 2), (4, 2), (2, 2), (3, 3), (3, 1)];
        expected.sort();
        assert_eq!(tiles, expected);
    }

    #[test]
    fn square_3x3_includes_all_nine() {
        let tiles = apply_affect_pattern((4, 2), patterns::SQUARE_3X3);
        assert_eq!(tiles.len(), 9);
        // Should include the target tile
        assert!(tiles.contains(&(4, 2)));
        // Should include all corners
        assert!(tiles.contains(&(3, 1)));
        assert!(tiles.contains(&(5, 3)));
    }

    #[test]
    fn target_tile_always_included_even_if_not_in_pattern() {
        // SINGLE pattern is empty, but target should still appear
        let tiles = apply_affect_pattern((0, 0), patterns::SINGLE);
        assert_eq!(tiles, vec![(0, 0)]);
    }
}
