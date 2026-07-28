---
title: Godot Battle Scaffold
type: spec
status: approved
tags: [godot, prototype, battle, ui, approved]
---

## Overview

Pivot the tactical RPG from the web stack (Excalibur.js + Svelte 5) to **Godot engine** for a better ecosystem (visual editor, tilemap tools, animation system, desktop/mobile export, single rendering layer). Start with a minimal battle scaffold to validate Godot workflows before committing to a full migration.

Phase 1: One battle scene — Guppy vs a "Debt Collector" villain on a 6×4 Duelyst-style grid. This proves out: grid rendering, turn system, movement, attack planning, and Godot's 2D pipeline for this game.

## Locked Decisions

- D1: Engine = **Godot 4** (latest stable) with **Compatibility renderer (GLES3)** for web export viability
- D2: Scripting = **GDScript** (fastest prototyping, native Godot)
- D3: Format = **6×4 grid** (not 9×5 from web version)
- D4: Movement = **1 move action per unit, path cost ≤ 2**. Orthogonal = 1, diagonal = 2 (same BFS as web version)
- D5: Mana = **Start with 3 mana, display-only in Phase 1** — nothing spends mana yet (no cards). Scaffold-only divergence from web's start-1/+1-per-turn/max-9 rule.
- D6: Character selection shows **all possible move tiles** (Duelyst-style overlay)
- D7: **Grid-based logic + tweened visuals** — discrete positions in model; 150–250ms tween between tile centers as pure presentation
- D8: **Attack adjacency = 8-way** (Chebyshev distance 1)
- D9: **Symmetric counterattack** — any surviving adjacent defender counterattacks with its ATK (Duelyst-true)
- D10: **No enemy movement indicators in Phase 1** — scope discipline
- D11: **No TileMap** — use Node2D grid with instanced Tile scenes (24×). TileMap needs tileset texture before rendering; Node2D gives per-tile overlays and faster iteration with placeholder colors.
- D12: **Grid implementation: 80×80 px tiles**, centered at ~(400, 180) in 1280×720 viewport

## Validation Goals (Go/No-Go Gate)

These are the measurable criteria that justify the phase — they prove Godot workflows work before Phases 2+.

- [ ] VG-1: Pure-logic tests run headless in CI in < 10 s (`godot --headless` + GdUnit4)
- [ ] VG-2: Web export produced and measured — record bundle size and load time
- [ ] VG-3: BFS + combat rules ported with no semantic compromises (diff against web suite's movement/attack tests)
- [ ] VG-4: Recorded subjective read: scene/sprite/tween iteration vs the Excalibur-canvas workflow it replaces

Phase 2 (cards, summons, full migration) gets specced only after VG-1–4 pass.

## Non-Goals (Phase 1)

No cards, no save/load, no walls (all 24 tiles are floor), no Provoke/Flying/diagonal-squeeze, no overworld, no roster picker. All Phase-1 code should comment these as *intentional omissions*.

## Requirements

### Functional Requirements
- FR-1: Godot project scaffold with 6×4 grid rendered on a 2D scene (Node2D, 80×80 px tiles)
- FR-2: 1 battle — Guppy (hero, 30 HP, 2 ATK) vs Debt Collector (villain, 10 HP, 2 ATK)
- FR-3: Grid-based movement: one move action per unit, BFS path cost ≤ 2 (ortho=1, diag=2)
- FR-4: Units start with 3 mana per turn (display only in Phase 1)
- FR-5: Units that haven't moved this turn show a visual indicator (pulsing glow ring)
- FR-6: Clicking a character highlights all reachable tiles (Duelyst-style corner-bracket overlay)
- FR-7: Turn system — player acts → End Turn → enemy AI acts → next player turn
- FR-8: Base attack: click adjacent enemy (8-way), symmetric counterattack on survival
- FR-9: Battle end: unit reaching 0 HP triggers victory/defeat banner with restart button
- FR-10: All game logic lives in pure `src/core/` RefCounted classes with zero Node imports — scenes are thin shell

### Non-Functional Requirements
- NFR-1: Runs at 60 FPS in Godot editor and exported builds
- NFR-2: Grid tiles and units scale to 1280×720 viewport
- NFR-3: Project renderer set to Compatibility from day one

## Acceptance Criteria

- [ ] AC-1: 6×4 grid renders centered at 1280×720 with alternating tile colors (chessboard)
- [ ] AC-2: Guppy (30 HP, 2 ATK) at (0, 2); Debt Collector (10 HP, 2 ATK) at (5, 1); HP visible on both
- [ ] AC-3: At player-turn start, Guppy shows a "can move" pulse indicator iff hasMoved == false
- [ ] AC-4: Clicking Guppy highlights all reachable tiles: BFS budget 2, ortho cost 1, diagonal cost 2; enemy-occupied tiles excluded; out-of-bounds excluded
- [ ] AC-5: Clicking a highlighted tile moves Guppy (tween ~200 ms), consumes the move action, clears overlay + indicator. Clicking elsewhere deselects.
- [ ] AC-6: With Guppy selected and hasAttacked == false, adjacent (8-way) villain tile shows an attack highlight; clicking it resolves base attack
- [ ] AC-7: Base attack: attacker deals ATK to defender; if defender survives, it counters for its ATK; hasAttacked set; dead units removed from grid + view
- [ ] AC-8: End Turn button → input locked → villain AI acts → player turn starts: hasMoved/hasAttacked reset, mana refills to 3/3, turn counter +1, indicator reappears
- [ ] AC-9: Villain AI: if adjacent → attack Guppy; else move (one action, budget 2) to the reachable tile minimizing Chebyshev distance to Guppy — deterministic tie-break: lowest y, then lowest x — then attack if now adjacent
- [ ] AC-10: Unit reaching 0 HP triggers battle-over banner ("Victory"/"Defeat") with Restart button that resets scene to AC-2 state
- [ ] AC-11: Mana HUD shows 3/3 at each player-turn start (display-only; nothing spends mana)
- [ ] AC-12: GdUnit4 tests for movement BFS, base attack/counter, enemy AI determinism, and turn-cycle reset pass headless

## Scenarios

### Scenario 1: Happy Path — Player Moves and Attacks
**Given** a fresh battle with Guppy and Debt Collector at range
**When** player clicks Guppy, sees movement overlay, clicks a tile 2 spaces away
**Then** Guppy moves to that tile (tween ~200 ms), movement indicator clears
**And** player clicks the adjacent villain to base attack
**Then** both trade damage (attacker first, then counter if defender survives), turn persists
**And** mana HUD remains at 3/3 (no spend in Phase 1)

### Scenario 2: Full Turn Cycle
**Given** player has acted (moved and attacked)
**When** player clicks "End Turn"
**Then** enemy AI deterministically moves toward Guppy within budget 2 and attacks if in range
**And** player's next turn begins: mana refills to 3/3, movement indicator reappears, turn counter +1

### Scenario 3: Duelyst-Style Movement Preview
**Given** Guppy has not moved yet this turn
**When** player clicks Guppy
**Then** all tiles within 2-step BFS path are highlighted with translucent fill + corner brackets
**And** clicking a highlighted tile moves Guppy there; moving to any tile costs its BFS distance in movement budget

### Scenario 4: Battle End — Victory and Defeat
**Given** Guppy defeats the Debt Collector
**When** Debt Collector HP reaches 0
**Then** "Victory" banner appears with Restart button
**Given** Debt Collector defeats Guppy
**When** Guppy HP reaches 0
**Then** "Defeat" banner appears with Restart button

## Design System

### Theme
Ocean debt-city — sunken, slightly grimy underwater metropolis. Not bright coral fantasy. Murky turquoise, deep navy shadows, oxidized copper, harsh red for villain elements.

### Color Palette
| Token | Hex | Use |
|-------|-----|-----|
| ocean_deep | #0b1a24 | Background / scene void |
| ocean_mid | #14313f | UI panels, shadows |
| ocean_shallow | #1e4b5f | Lighter tile variant |
| tile_a | #183b4a | Base chessboard tile A |
| tile_b | #224e60 | Base chessboard tile B |
| grid_line | #0f2d3a | Subtle tile borders |
| guppy_body | #4fd1c5 | Hero fill |
| guppy_glow | #7fffe6 | Hero action-ready indicator |
| villain_body | #c94c4c | Villain fill |
| villain_glow | #ff6b6b | Villain action-ready indicator |
| move_fill | rgba(79, 209, 197, 0.22) | Reachable tile overlay |
| move_bracket | #e8dcc5 | Corner bracket outline |
| attack_range | #e85d4e | Adjacent enemy attack marker |
| selection_ring | #f4c430 | Selected unit ring |
| mana_filled | #60a5fa | Active mana crystal |
| mana_empty | #1e3a4c | Spent mana crystal |
| damage_popup | #ff7a7a | Floating damage number |
| counter_popup | #ffb86c | Counterattack number |
| ui_text | #d6e8ef | Labels, numbers |

### Grid Metrics (1280×720)
- Tile size: 80×80 px
- Grid total: 6×4 = 480×320 px
- Grid origin: (400, 180) → grid spans (400, 180) to (880, 500)
- Tile gap: 2 px grid_line borders
- Unit size: 56×56 px sprite centered in tile
- Selection ring: 68×68 px, 4 px stroke, centered

## Implementation Plan

### Project Structure
```
godot/
├── project.godot               # renderer: Compatibility; viewport 1280×720, stretch canvas_items
├── src/core/                   # PURE — no Node, no SceneTree. class_name'd RefCounted
│   ├── grid_state.gd           # tiles[y][x], units: Dictionary[Vector2i, GridUnit], w/h
│   ├── grid_unit.gd            # faction, hp, atk, has_moved, has_attacked, is_alive
│   ├── grid_movement.gd        # get_movement_range(state, unit) -> Dictionary[Vector2i, int]
│   ├── combat.gd               # base_attack(state, attacker, defender) -> AttackResult
│   ├── battle_state.gd         # grid, turn_phase, turn_number, mana, result
│   ├── battle_engine.gd        # move_unit / player_attack / end_turn → start_player_turn
│   └── enemy_ai.gd             # decide(state) -> {move?: Vector2i, attack?: Vector2i}
├── scenes/battle/
│   ├── battle.tscn + battle.gd # orchestrator: input, selection, turn flow, view sync
│   ├── tile.tscn + tile.gd     # ColorRect + highlight layer (instanced 24×)
│   ├── unit_view.tscn + .gd    # placeholder sprite, HP label, indicator pulse, tween
│   └── battle_hud.gd           # CanvasLayer: mana, turn label, End Turn, banner
└── tests/                      # GdUnit4
    ├── grid_movement_test.gd
    ├── combat_test.gd
    ├── enemy_ai_test.gd
    └── battle_engine_test.gd
```

### Scene Tree
```
BattleScene (Node2D)
├── Camera2D (anchors to 1280×720, no zoom)
├── Background (ColorRect) — ocean_deep with vignette
├── BattleGrid (Node2D)
│   ├── Tiles (Node2D) — 24× Tile.tscn, positions computed in code
│   ├── MovementOverlay (Node2D) — pooled TileOverlay instances
│   └── AtmosphereParticles (CPUParticles2D) — optional bubbles
├── Units (Node2D)
│   ├── Guppy (Unit.tscn)
│   └── Villain (Unit.tscn)
├── UI (CanvasLayer)
│   ├── ManaPanel (Control) — 3× ManaCrystal
│   ├── TurnUI (Control) — EndTurnButton + EnemyThinkingBanner
│   └── DamagePopupLayer (Control) — popups spawned here
├── InputHandler (Node) — one _unhandled_input, pixel→grid division
└── TurnManager (Node) — state machine: PLAYER_TURN → ENEMY_TURN → PLAYER_TURN
```

### Key Patterns
- **Input:** One `_unhandled_input` on battle.gd — pixel-to-grid math, no per-tile Area2Ds (48 collision nodes not needed for a uniform grid)
- **BFS:** Near 1:1 port of web's `GridMovement.getMovementRange()` with Vector2i replacing {x, y} + string keys
- **Turn cycle:** Phase enum (PLAYER_TURN, ENEMY_TURN, BATTLE_OVER) in battle.gd; battle_engine.gd owns pure state transitions
- **Selection overlay:** Per-tile Highlight ColorRect (move: cyan @ 22% alpha; attack: red @ 50%). Toggle visibility from valid_moves Dictionary
- **Indicator:** ColorRect under unit, pulsing via looping Tween on modulate.a. Visible iff phase==PLAYER_TURN and not unit.has_moved
- **Attack logic:** combat.gd::base_attack() — pure, returns AttackResult {damage, counter_damage, deaths}. View animates from result
- **Enemy AI:** Deterministic — argmin Chebyshev distance over movement range, lowest-y lowest-x tie-break

### Reusable Scenes
| Scene | Purpose | Art Swap Method |
|-------|---------|-----------------|
| Tile.tscn | One grid cell | Swap Body texture |
| TileOverlay.tscn | Reachable/selected/attack highlight | Swap sprite frame/texture |
| Unit.tscn | Base unit logic + placeholder | Swap Body texture |
| Guppy.tscn | Extends Unit | Override body texture |
| Villain.tscn | Extends Unit | Override body texture |
| ManaCrystal.tscn | One mana pip | Swap filled/empty texture |
| DamagePopup.tscn | Floating number | Label text + theme |
| Button (built-in) | End Turn | Native focus/hover/click |

### Animation Timings
- Move tween: 0.25 s per tile (sine easing)
- Attack lunge: 0.2 s slide 20 px toward target + back
- Damage popup: 0.8 s rise 30 px + fade
- Turn banner: 0.3 s fade in/out
- Mana crystal pop: 0.15 s stagger
- Indicator pulse: 1.2 s loop (scale 1.0 → 1.15 → 1.0)
- Use Tween for movement/popups, AnimationPlayer for repeated UI states

### Effort Estimate
~18 files, ~1,150 LOC GDScript. Timeline: ~1 week for a TypeScript dev new to Godot (0.5d setup, 1d core port, 1d board/input/overlay, 1d turn cycle + AI + HUD, ~1d tests + polish)

### Key Warnings
1. Set **Compatibility renderer** in project.godot before writing any code
2. Write the movement BFS test **first** (RED) — the one discipline that kept the web core at 0 bugs
3. No autoloads until a second scene exists — one battle scene needs zero
4. Avoid EventBus/autoload pattern — direct signal connections are simpler

## Open Questions

- [ ] Q1: [RESOLVED] TileMap vs Node2D grid? → **Node2D with instanced Tile scenes** (24 instances, computed layout). TileMap needs tileset asset first; Node2D gives per-tile overlays and faster iteration.
- [ ] Q2: [RESOLVED] Grid-based or pixel-free movement? → **Grid-based, snap-to-tile**. Discrete positions in model, tweened between tile centers. No pixel-free.
- [ ] Q3: [RESOLVED] Enemy movement indicators? → **No** in Phase 1 — "your unit can still act" is for player clarity; enemy intent is a later feature.

## References

- Web version architecture (departure point): @wiki/core:architecture
- Duelyst movement reference: @wiki/patterns:duelyst-corner-bracket-overlay-system
- Web grid system: src/game/grid/GridTypes.ts, GridMovement.ts
- Oracle analysis (this session): @wiki:memory:godot-migration-analysis-stay-on-web-stack
- Designer spec (this session): des-1 output — full design system, color palette, gate-by-gate UX specs