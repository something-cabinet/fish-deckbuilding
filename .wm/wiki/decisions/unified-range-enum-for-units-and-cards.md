---
{}
relates_to:
  - {type: references, target: wiki:specs:godot-battle-scaffold}
---

---
title: Decision: Unified Range Enum for Units and Cards
type: decision
id: wiki:decisions:unified-range-enum-for-units-and-cards
tags: [decision, range, combat, cards]
---

---
title: Decision: Unified Range Enum for Units and Cards
type: decision
status: approved
tags: [decision, range, combat, cards]
---

## Context
Both unit base attacks and card effects need a range concept. Previously, unit attacks used hardcoded Chebyshev(1) adjacency and cards used a numeric `range: i32` field. Ranged was treated as a keyword (like Provoke) with magic number `attack_range: 99`.

## Decision
A single `Range { Melee, Ranged }` enum shared between `GridUnit.range` (for base attacks) and `CardEffect.range` (for card targeting). `Range::Ranged` = any tile on the board (idiom: `GRID_WIDTH + GRID_HEIGHT`), matching Duelyst's `REACH_RANGED`.

## Rationale
- Eliminates the magic number `99` for ranged attacks
- One enum, one `can_reach()` function, same semantics everywhere
- Cards and units naturally share the same targeting concept
- Ranged is not a keyword — it's a fundamental unit stat
- Duelyst confirms: `reach` lives on Entity, Ranged keyword just bumps it to `BOARDCOL + BOARDROW`

## Consequences
- Existing code pattern: `if cheb == 1` → replaced by `can_reach(from, to, unit.range)`
- Counterattack logic uses defender's range: Melee counters only adjacent, Ranged always counters
- Future Ranged enemies need no special AI logic — just set `Range::Ranged`
- Cleaner `valid_targets()` pipeline: Stage 1 is just matching on `Range`

## Related
- `rust/src/core/grid/model/unit.rs`
- `rust/src/core/cards/targeting.rs`
- @wiki/specs\:card-system-in-battle-deck D12