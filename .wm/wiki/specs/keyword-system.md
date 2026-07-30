---
title: Keyword System — Provoke, Ranged, Flying, Dying Wish, Opening Gambit
type: spec
tags: [game-design, keywords, combat, units, rust]
status: draft
---

---
title: Keyword System — Provoke, Flying, Dying Wish, Opening Gambit
type: spec
status: draft
tags: [game-design, keywords, combat, units, rust]
---

## Overview

Define the core keyword system for units, inspired by Duelyst's modifier system. Keywords modify how a unit interacts with movement, attacks, and death. **Ranged is not a keyword** — it's the `Range::Ranged` variant on the unified `Range` enum shared between units and cards (see `wiki:specs:card-system-in-battle-deck`). Scoped to 4 core keywords that create tactical depth.

## Locked Decisions

- D1: **Keyword as enum** — `Keyword { Taunt, Elusive, PartingGift(Effect), Commencement(Effect) }` stored as `Vec<Keyword>` on GridUnit. Ranged is the `Range::Ranged` enum variant, not a keyword.
- D2: **4 core keywords** — Taunt (was Provoke), Elusive (was Flying), Parting Gift (was Dying Wish), Commencement (was Opening Gambit). Each targets a different tactical axis: positioning (Taunt), mobility (Elusive), death value (Parting Gift), summon value (Commencement).
- D3: **No keyword interactions** — Keywords are independent. No keyword references another keyword in its implementation. This prevents combinatorial complexity.
- D4: **Keywords are per-unit, not per-card** — A unit's keywords are defined on its GridUnitTemplate (used in Summon cards) or as inherent properties of hero/enemy types.

## Requirements

### Functional Requirements

- FR-1: Keyword enum: `Taunt`, `Elusive`, `PartingGift(Effect)`, `Commencement(Effect)`. Stored as `Vec<Keyword>` in GridUnit.
- FR-2: **Taunt** — Enemy units cannot move through tiles adjacent to a Taunt unit. BFS pathfinding treats tiles Chebyshev-adjacent to a Taunt unit as blocked (unless the moving unit has Elusive). If a unit starts its turn adjacent to a Taunt unit and that Taunt unit is in attack range, the unit must attack the Taunt unit if it attacks at all (forced target).
- FR-2a: Multiple adjacent Taunt units: attacking unit may choose which Taunt unit to target.
- FR-3: **Elusive** — Unit can pass over any tile type and any unit (friend or foe) during movement. BFS treats all tiles as passable (cost 1). Elusive units ignore Taunt adjacency blocking entirely.
- FR-3a: Elusive does not affect attack range or targeting — only movement and Taunt immunity.
- FR-4: **Parting Gift** — Effect triggers when the unit dies (HP ≤ 0, removed from grid). The effect resolves at the unit's position before removal. Effect types: Damage, Heal, Shield, Summon.
- FR-4a: Parting Gift resolves before the unit is visually removed (death animation plays after).
- FR-5: **Commencement** — Effect triggers immediately when the unit is summoned (placed on grid). Fires before summoning sickness is applied. Effect types: Damage, Heal, Shield, DrawCards.
- FR-5a: Commencement targeting follows standard card targeting rules (Range + TargetFilter + AoE).
- FR-6: Keywords are defined on GridUnitTemplate and copied to the spawned GridUnit. Hero and enemy types define their keywords in constants.
- FR-7: Effect resolution for DyingWish/OpeningGambit uses the same `resolve_effect()` function as card effects.

### Non-Functional Requirements

- NFR-1: Keyword logic is pure Rust (zero Godot deps), unit-testable.
- NFR-2: BFS with Provoke/Flying checks must complete in < 1ms.
- NFR-3: No keyword references another keyword in its implementation.

## Acceptance Criteria

- [ ] AC-1: Keyword enum defined with 4 variants (Provoke, Flying, DyingWish, OpeningGambit)
- [ ] AC-2: Ranged is NOT in the Keyword enum (it's Range::Ranged on GridUnit instead)
- [ ] AC-3: GridUnit stores `Vec<Keyword>`, copied from template on spawn
- [ ] AC-4: Provoke unit blocks enemy movement through its adjacent tiles
- [ ] AC-5: Flying unit passes over Provoke adjacency and any unit-occupied tiles
- [ ] AC-6: Unit adjacent to Provoke must attack it if attacking at all
- [ ] AC-7: Dying Wish effect triggers on unit death at its position
- [ ] AC-8: Opening Gambit effect triggers on summon before summoning sickness
- [ ] AC-9: Dying Wish / Opening Gambit use existing resolve_effect() function
- [ ] AC-10: BFS pathfinding accounts for Provoke adjacency blocking
- [ ] AC-11: All tests pass with `cargo test`

## Scenarios

### Scenario 1: Provoke Blocks Movement
**Given** enemy unit at (3, 2), Provoke unit at (4, 2), hero at (2, 2)
**When** the enemy tries to path from (3, 2) to (5, 2) (past the Provoke unit)
**Then** BFS reports (4, 2) as blocked (adjacent to Provoke unit)
**Then** the enemy must find an alternate path or cannot pass

### Scenario 2: Flying Ignores Provoke
**Given** Flying unit at (3, 2), Provoke unit at (4, 2)
**When** the Flying unit moves from (3, 2) to (5, 2)
**Then** BFS allows passing through (4, 2) (Flying ignores Provoke)
**Then** the Flying unit completes its movement past the Provoke unit

### Scenario 3: Dying Wish Triggers
**Given** a minion with DyingWish(Damage(2)) has 1 HP remaining
**When** the minion takes 3 damage (HP → 0)
**Then** the Dying Wish resolves: Damage 2 to all units within AoE::Single at the minion's position
**Then** the minion is removed from the grid

### Scenario 4: Opening Gambit on Summon
**Given** a Summon card for a unit with OpeningGambit(Heal(3))
**When** the card is played and the unit appears on the grid
**Then** the Opening Gambit fires: Heal(3) targets the nearest damaged friendly unit
**Then** summoning sickness is applied to the unit

### Scenario 5: Provoke Forced Target
**Given** hero is adjacent to a Provoke enemy and also adjacent to a non-Provoke enemy
**When** the hero tries to attack the non-Provoke enemy
**Then** the attack is rejected — "Must attack Provoke unit"
**When** the hero attacks the Provoke enemy instead
**Then** the attack succeeds

## Technical Notes

- Keyword enum: added to `rust/src/core/grid/model/unit.rs`. GridUnit gains `keywords: Vec<Keyword>` field.
- Provoke BFS: in `movement.rs`, for each step candidate, check if that tile is Chebyshev-adjacent to any unit with Provoke keyword. If so and moving unit does NOT have Flying, block the step.
- Provoke forced-target: `engine.rs::player_attack()` checks if any adjacent enemy has Provoke keyword. If so, the attack target must be one of those units.
- Flying: BFS in `movement.rs` — Flying units traverse all tiles at cost 1, no blocking checks.
- Dying Wish: in `die()` or `apply_damage()` — after setting alive=false, check keywords for DyingWish, call resolve_effect with stored effect at unit's position.
- Opening Gambit: in `spawn_unit()` — after placing unit on grid, before applying summoning sickness, check for OpeningGambit, resolve effect.
- Ranged is NOT a keyword: instead, a unit has `range: Range` field. `Range::Ranged` on GridUnit provides full-board attack range and unconditional counterattack. See `wiki:specs:card-system-in-battle-deck` for Range enum, `wiki:specs:enemy-system-deck-ai-difficulty` for unit combat.

## Open Questions

- [ ] OQ-1: **(RESOLVED)** Ranged removed from keywords — it's `Range::Ranged` on the shared Range enum.
- [ ] OQ-2: **(RESOLVED)** Provoke forced-target only if Provoke unit is in attack range.
- [ ] OQ-3: **(RESOLVED)** No keyword interactions — each keyword is independent.
- [ ] OQ-4: Which units get which keywords in Phase 1? Hero starts with none. Enemies: Easy (none), Medium (Provoke), Hard (Provoke + Flying or Dying Wish). Summon cards define keywords per minion template.