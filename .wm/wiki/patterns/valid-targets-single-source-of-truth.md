---
{}
relates_to:
  - {type: references, target: wiki:specs:card-system-in-battle-deck}
---

---
title: Pattern: Valid Targets as Single Source of Truth
type: pattern
id: wiki:patterns:valid-targets-single-source-of-truth
tags: [pattern, ui, validation, architecture]
---

---
title: Pattern: Valid Targets as Single Source of Truth
type: pattern
tags: [pattern, ui, validation, architecture]
---

## Problem
The Project's Critical Patterns doc warns that all P0 bugs live in the untested UI wiring layer. When the bridge has its own targeting logic (ad-hoc tile filters, manual range checks) and the core validator uses different logic, they inevitably drift. A card that works in core tests fails in the UI, or vice versa.

## Solution
A single `valid_targets(effect, caster, grid, caster_faction) -> Vec<GridCoord>` function in the pure core. It is called by:

1. The **bridge overlay** — to highlight valid tiles when a card is selected
2. The **bridge click handler** — to reject clicks outside the valid set (no card consumed, no mana deducted)
3. The **AI** — to determine which targets are valid for enemy card play
4. The **engine** — to validate play decisions before resolving effects

```rust
pub fn valid_targets(effect: &CardEffect, caster: (i32, i32), grid: &GridState, caster_faction: Faction) -> Vec<(i32, i32)> {
    // Stage 1: Range filter (Melee = Chebyshev 1, Ranged = all tiles)
    // Stage 2: Target filter (EnemyUnit, AllyUnit, AnyUnit, EmptyTile, AnyTile, Self)
    // Stage 3: Edge-crop (pattern must fully fit on board for AnyTile/EmptyTile)
}
```

One code path. One test suite. No drift possible.

## When to Use
- Any game where clickable targets (tiles, units) must be validated before action
- Systems with both a visual layer and a validation layer
- Any project with the pattern of "tested core, untested wiring" (see Critical Patterns)

## When Not to Use
- Single-file tools with no separation between rendering and logic
- Systems where the UI is the only interface (no programmatic validation needed)

## Related
- @wiki/core:critical-patterns (2026-07-27 — Test the UI Orchestration Layer)
- Implemented in: `rust/src/core/cards/targeting.rs`