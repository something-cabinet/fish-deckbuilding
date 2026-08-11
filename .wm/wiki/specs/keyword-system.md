---
title: Keyword System — Provoke, Ranged, Flying, Dying Wish, Opening Gambit
type: spec
tags: [game-design, keywords, combat, units]
status: draft
---

## Overview

Define the core keyword system for units, inspired by Duelyst's modifier system. Keywords modify how a unit interacts with movement, attacks, and death. **Ranged is not a keyword** — it's the `Range.Ranged` variant on the unified `Range` enum shared between units and cards (see `wiki:specs:card-system-in-battle-deck`). Scoped to 4 core keywords that create tactical depth.

## Locked Decisions

- D1: **Keyword as enum** — `Keyword { Taunt, Elusive, PartingGift(Effect), Commencement(Effect) }` stored as `Keyword[]` on GridUnit. Ranged is the `Range.Ranged` enum variant, not a keyword.
- D2: **4 core keywords** — Taunt (was Provoke), Elusive (was Flying), Parting Gift (was Dying Wish), Commencement (was Opening Gambit). Each targets a different tactical axis: positioning (Taunt), mobility (Elusive), death value (Parting Gift), summon value (Commencement).
- D3: **No keyword interactions** — Keywords are independent. No keyword references another keyword in its implementation. This prevents combinatorial complexity.
- D4: **Keywords are per-unit, not per-card** — A unit's keywords are defined on its GridUnitTemplate (used in Summon cards) or as inherent properties of hero/enemy types.

## Requirements

### Functional Requirements

- FR-1: Keyword enum: `Taunt`, `Elusive`, `PartingGift(Effect)`, `Commencement(Effect)`. Stored as `Keyword[]` in GridUnit.
- FR-2: **Taunt** — Enemy units cannot move through tiles adjacent to a Taunt unit. BFS pathfinding treats tiles Chebyshev-adjacent to a Taunt unit as blocked (unless the moving unit has Elusive). If a unit starts its turn adjacent to a Taunt unit and that Taunt unit is in attack range, the unit must attack the Taunt unit if it attacks at all (forced target).
- FR-2a: Multiple adjacent Taunt units: attacking unit may choose which Taunt unit to target.
- FR-3: **Elusive** — Unit can pass over any tile type and any unit (friend or foe) during movement. BFS treats all tiles as passable (cost 1). Elusive units ignore Taunt adjacency blocking entirely.
- FR-3a: Elusive does not affect attack range or targeting — only movement and Taunt immunity.
- FR-4: **Parting Gift** — Effect triggers when the unit dies (HP = 0, removed from grid). The effect resolves at the unit's position before removal. Effect types: Damage, Heal, Shield, Summon.
- FR-4a: Parting Gift resolves before the unit is visually removed (death animation plays after).
- FR-5: **Commencement** — Effect triggers immediately when the unit is summoned (placed on grid). Fires before summoning sickness is applied. Effect types: Damage, Heal, Shield, DrawCards.
- FR-5a: Commencement targeting follows standard card targeting rules (Range + TargetFilter + AoE).
- FR-6: Keywords are defined on GridUnitTemplate and copied to the spawned GridUnit. Hero and enemy types define their keywords in constants.
- FR-7: Effect resolution for PartingGift/Commencement uses the same `resolveEffect()` function as card effects.

### Non-Functional Requirements

- NFR-1: Keyword logic is pure TypeScript, unit-testable.
- NFR-2: BFS with Taunt/Elusive checks must complete in < 1ms.
- NFR-3: No keyword references another keyword in its implementation.

## Acceptance Criteria

- [ ] AC-1: Keyword enum defined with 4 variants (Taunt, Elusive, PartingGift, Commencement)
- [ ] AC-2: Ranged is NOT in the Keyword enum (it's Range.Ranged on GridUnit instead)
- [ ] AC-3: GridUnit stores `Keyword[]`, copied from template on spawn
- [ ] AC-4: Taunt unit blocks enemy movement through its adjacent tiles
- [ ] AC-5: Elusive unit passes over Taunt adjacency and any unit-occupied tiles
- [ ] AC-6: Unit adjacent to Taunt must attack it if attacking at all
- [ ] AC-7: Parting Gift effect triggers on unit death at its position
- [ ] AC-8: Commencement effect triggers on summon before summoning sickness
- [ ] AC-9: Parting Gift / Commencement use existing resolveEffect() function
- [ ] AC-10: BFS pathfinding accounts for Taunt adjacency blocking
- [ ] AC-11: All tests pass with `npm test`

## Scenarios

### Scenario 1: Taunt Blocks Movement
**Given** enemy unit at (3, 2), Taunt unit at (4, 2), hero at (2, 2)
**When** the enemy tries to path from (3, 2) to (5, 2) (past the Taunt unit)
**Then** BFS reports (4, 2) as blocked (adjacent to Taunt unit)
**Then** the enemy must find an alternate path or cannot pass

### Scenario 2: Elusive Ignores Taunt
**Given** Elusive unit at (3, 2), Taunt unit at (4, 2)
**When** the Elusive unit moves from (3, 2) to (5, 2)
**Then** BFS allows passing through (4, 2) (Elusive ignores Taunt)
**Then** the Elusive unit completes its movement past the Taunt unit

### Scenario 3: Parting Gift Triggers
**Given** a minion with PartingGift(Damage(2)) has 1 HP remaining
**When** the minion takes 3 damage (HP ? 0)
**Then** the Parting Gift resolves: Damage 2 to all units within AoE at the minion's position
**Then** the minion is removed from the grid

### Scenario 4: Commencement on Summon
**Given** a Summon card for a unit with Commencement(Heal(3))
**When** the card is played and the unit appears on the grid
**Then** the Commencement fires: Heal(3) targets the nearest damaged friendly unit
**Then** summoning sickness is applied to the unit

### Scenario 5: Taunt Forced Target
**Given** hero is adjacent to a Taunt enemy and also adjacent to a non-Taunt enemy
**When** the hero tries to attack the non-Taunt enemy
**Then** the attack is rejected — "Must attack Taunt unit"
**When** the hero attacks the Taunt enemy instead
**Then** the attack succeeds

## Technical Notes

- Keyword enum: defined in `src/lib/game/units/enums/keyword.enum.ts`. GridUnit gains `keywords: Keyword[]` field.
- Taunt BFS: in `movement.service.ts`, for each step candidate, check if that tile is Chebyshev-adjacent to any unit with Taunt keyword. If so and moving unit does NOT have Elusive, block the step.
- Taunt forced-target: `actions.service.ts::unitAttack()` checks if any adjacent enemy has Taunt keyword. If so, the attack target must be one of those units.
- Elusive: BFS in `movement.service.ts` — Elusive units traverse all tiles at cost 1, no blocking checks.
- Parting Gift: in `death()` or `dealDamage()` — after setting alive=false, check keywords for PartingGift, call resolveEffect with stored effect at unit's position.
- Commencement: in `spawnUnit()` — after placing unit on grid, before applying summoning sickness, check for Commencement, resolve effect.
- Ranged is NOT a keyword: instead, a unit has `range: Range` field. `Range.Ranged` on GridUnit provides full-board attack range and unconditional counterattack. See `wiki:specs:card-system-in-battle-deck` for Range enum, `wiki:specs:enemy-system-deck-ai-difficulty` for unit combat.

## Open Questions

- [ ] OQ-1: **(RESOLVED)** Ranged removed from keywords — it's `Range.Ranged` on the shared Range enum.
- [ ] OQ-2: **(RESOLVED)** Taunt forced-target only if Taunt unit is in attack range.
- [ ] OQ-3: **(RESOLVED)** No keyword interactions — each keyword is independent.
- [ ] OQ-4: Which units get which keywords in Phase 1? Hero starts with none. Enemies: Easy (none), Medium (Taunt), Hard (Taunt + Elusive or Parting Gift). Summon cards define keywords per minion template.