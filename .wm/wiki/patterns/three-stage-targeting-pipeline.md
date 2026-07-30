---
{}
relates_to:
  - {type: references, target: wiki:specs:card-system-in-battle-deck}
---

---
title: Pattern: Three-Stage Targeting Pipeline
type: pattern
id: wiki:patterns:three-stage-targeting-pipeline
tags: [pattern, cards, targeting, rust]
---

---
title: Pattern: Three-Stage Targeting Pipeline
type: pattern
tags: [pattern, cards, targeting, rust]
---

## Problem
Card games need to determine valid play positions for cards. A naive numeric range (e.g. "range ≤ 3") conflates distance, target type, and blast area into one scalar, making it hard to express "can target any ally at any distance" vs "can target any adjacent enemy."

## Solution
A three-stage pipeline modeled after Duelyst's targeting system:

### Stage 1 — Range Filter
Which tiles are reachable?
- `Range::Melee` = Chebyshev distance 1 (8-way adjacent)
- `Range::Ranged` = all tiles on the board

### Stage 2 — Target Filter  
What occupies the tile?
- `EnemyUnit` / `AllyUnit` / `AnyUnit` / `EmptyTile` / `AnyTile` / `Self`

### Stage 3 — Edge Crop
Does the blast pattern fully fit on the board?
- For `AnyTile` and `EmptyTile` targets: reject if any pattern offset falls outside the board
- For unit-targeted AoE: allow partial clips (otherwise allies on the edge become unhealable)

Expressed as Rust enums:
```rust
enum Range { Melee, Ranged }
enum TargetFilter { EnemyUnit, AllyUnit, AnyUnit, EmptyTile, AnyTile, Self }
```

This maps directly to Duelyst's `_filterPlayPositions` (where can I click) + `_filterApplyPositions` (what actually gets hit).

## When to Use
- Any grid-based card game needing distance + target + blast validation
- Systems where cards need to express different targeting constraints clearly

## When Not to Use
- Simple point-and-click with no distance or filtering constraints

## Related
- Implemented in: `rust/src/core/cards/targeting.rs`