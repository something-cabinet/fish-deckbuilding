---
title: Godot Battle Scaffold
type: spec
tags:
- godot
- prototype
- battle
- ui
- approved
status: superseded
implementation_notes: 'Superseded 2026-08-04 (wm-verify): dead Godot-era direction; superseded by the JS combat slice (battle-ui-fab-sts-rebuild).'
---

---
title: Godot Battle Scaffold
type: spec
tags: [godot, prototype, battle, ui, approved]
status: approved
---

## Overview

Godot 4 battle scaffold using godot-rust (gdext) with TDD + Compiler-Driven Development. Core logic is pure Rust (55+ tests), scene layer is thin gdext bridge. Phase 1 implemented: 6×4 grid battle (Guppy vs Debt Collector). Phase 2 scope: expand to 9×5 Duelyst grid, add mana springs, enforce move-then-attack ordering, and add enemy movement indicators. Base attack uses the unified `Range` enum shared with cards.

## Locked Decisions

- D1: Engine = **Godot 4** with Compatibility renderer (gl_compatibility) for web export
- D2: Scripting = **godot-rust gdext** (Rust cdylib, not GDScript)
- D3: Format = **9×5 grid** (expanded from Phase 1's 6×4; spec D4 in `fish-tactical-rpg` always said 9×5)
- D4: Movement = **1 move action per unit, BFS path cost ≤ 2**. Orthogonal = 1, diagonal = 2
- D5: Mana = **Start with 3 mana, display-only in Phase 1** (see `wiki:specs:card-system-in-battle-deck` for the full mana ramping system)
- D6: Character selection shows **all possible move tiles** (Duelyst-style overlay)
- D7: **Grid-based logic + tweened visuals** — scale-in on placement (full position tweens deferred)
- D8: **Base attack range = unified Range enum** — `GridUnit.range: Range` determines attack distance. `Range::Melee` (default hero) = Chebyshev distance 1 (8-way). `Range::Ranged` = any tile. See `wiki:specs:card-system-in-battle-deck` for the enum. This replaces hardcoded adjacency.
- D8a: **Counterattack** uses the defender's Range. Melee defender counterattacks only adjacent attackers. Ranged defender counterattacks at any distance.
- D9: **Symmetric counterattack** — When a unit attacks, the defender also attacks (if within the defender's attack range).
- D10: **Enemy movement indicators** in Phase 2 (not Phase 1). Click enemy → show move range + attack range overlays.
- D11: **Node2D grid with instanced ColorRects** (45 tiles for 9×5, code-generated)
- D12: **80×80 px tiles**, centered at ~(360, 180) in 1280×720 viewport (adjusted from Phase 1 centering)
- D13: **Mana springs** — 3 special tiles at (4,0), (4,4), (5,2) on the 9×5 grid. A unit ending its turn on a mana spring tile grants +1 max mana (once per game per spring). Uses a different visual color (cyan tint) and has an interaction icon.
- D14: **Move-then-attack ordering** — Units must move before attacking (not after). The engine rejects `player_attack` if the unit has already moved this turn. Move-after-attack is also disallowed.

## Acceptance Criteria

### Phase 1 (Completed)
- [X] AC-1: 6×4 grid renders centered at 1280×720 with alternating tile colors
- [X] AC-2: Guppy (30 HP, 2 ATK) at (0, 2); Debt Collector (10 HP, 2 ATK) at (5, 1); HP visible
- [X] AC-3: Guppy shows pulse indicator iff hasMoved == false
- [X] AC-4: BFS budget 2, ortho cost 1, diagonal cost 2; enemies block, out-of-bounds excluded
- [X] AC-5: Click highlighted tile moves Guppy, clears overlay + indicator
- [X] AC-6: Adjacent enemy shows attack highlight when selected
- [X] AC-7: Base attack + symmetric counterattack; dead units removed
- [X] AC-8: End Turn → enemy AI → player turn reset (flags, mana, turn counter)
- [X] AC-9: Enemy AI deterministic (Chebyshev min, lowest-y lowest-x tie-break)
- [X] AC-10: Battle-over banner with Restart button
- [X] AC-11: Mana HUD shows 3/3 (display-only)
- [X] AC-12: 55 cargo tests for BFS, combat, AI determinism, turn cycle

### Phase 2 (New)
- [ ] AC-13: 9×5 grid renders centered at 1280×720 with alternating tile colors
- [ ] AC-14: Mana spring tiles at (4,0), (4,4), (5,2) visually distinct (cyan tint, icon)
- [ ] AC-15: Stepping on a mana spring increases max_mana by 1 (once per spring per battle)
- [ ] AC-16: Mana spring grants max_mana only when unit ends its turn on the tile
- [ ] AC-17: Attack rejected if unit has already moved this turn
- [ ] AC-18: Move-after-attack is rejected
- [ ] AC-19: `GridUnit` uses `range: Range` enum (Melee/Ranged) — not hardcoded adjacency
- [ ] AC-20: `Range::Melee` unit attacks only adjacent (Chebyshev 1) tiles
- [ ] AC-21: `Range::Ranged` unit can attack any tile on the board
- [ ] AC-22: Melee defender counterattacks only adjacent attackers
- [ ] AC-23: Ranged defender counterattacks at any distance
- [ ] AC-24: Clicking an enemy shows its move range (white) + attack range (red) overlays
- [ ] AC-25: Hero start (0, 2); Enemy start (8, 2) on 9×5 grid
- [ ] AC-26: All existing 55 tests still pass after grid + range changes
- [ ] AC-27: New tests cover 9×5 bounds, mana spring, move-then-attack, Range enum

## Scenarios

### Scenario 1: Expand Grid
**Given** grid is 6×4 with Guppy at (0,2) and Enemy at (5,1)
**When** GRID_WIDTH=9, GRID_HEIGHT=5
**Then** grid renders as 9×5 (45 tiles)
**Then** Guppy at (0, 2), Enemy at (8, 2)
**Then** all BFS/combat/AI work within new bounds

### Scenario 2: Move-then-Attack
**Given** Guppy has not moved or attacked
**When** player tries to attack first
**Then** attack rejected — "Must move before attacking"
**When** player moves Guppy first then attacks
**Then** move succeeds, then attack succeeds

### Scenario 3: Ranged Unit Attacks from Distance
**Given** a Ranged enemy (Range::Ranged) at (8, 2), hero at (0, 2)
**When** enemy turn runs
**Then** enemy attacks hero directly (full board range)
**Then** hero takes damage
**Then** hero does NOT counterattack (melee can't reach)

### Scenario 4: Ranged Counterattack
**Given** Ranged enemy adjacent to hero
**When** hero attacks the Ranged enemy
**Then** hero deals damage
**Then** Ranged enemy counterattacks (Range::Ranged always reaches)

## Technical Notes

- Grid constants: `GRID_WIDTH 9`, `GRID_HEIGHT 5` in `rust/src/core/constants.rs`
- Grid centering: adjust `GRID_ORIGIN_X/Y` for 9×5 at 80px tiles in 1280×720
- `Range` enum defined in core (shared import): `Melee` = Chebyshev 1, `Ranged` = full board
- `GridUnit.range: Range` replaces hardcoded Chebyshev(1) in attack checks
- Counterattack: `base_attack.rs` checks `defender.range` — Melee requires adjacency, Ranged always true
- Move-then-attack: `engine.rs::player_attack()` guards against `moves_made > 0 && attacks_made == 0`
- Mana spring: new `TileType::ManaSpring`, claimed per-battle on end_turn when occupied
- All new code is pure Rust (core) + minimal bridge for overlay rendering

## Remaining Gaps

- D7 partial: scale-in tween implemented; position tweens deferred
- Bridge has no automated tests (requires Godot engine); test helpers exist
- Mana springs use simple tint + icon; corner-bracket sprites deferred to asset pipeline