---
title: Fish Roguelite Deckbuilding — README
type: core
tags: [core, readme]
---

---
title: Fish Tactical RPG — README
type: core
tags: [core, readme]
---

# Fish Tactical RPG

A tactical RPG about **Guppy the Debtor** — a fish trying to pay off debt in an underwater city. Duelyst-style grid combat, built with **Godot 4** + **godot-rust (gdext)**. Engine migrated off Excalibur.js/Svelte — see wiki:decisions:godot-rust-gdext-pivot; that earlier stack is retired.

## Quick Start

```bash
cd rust && cargo build      # build the gdext cdylib
cargo test                  # run core Rust tests
godot4 --path godot/        # open the project (see compile errors in this terminal, not the editor)
```

## Core Gameplay

**Combat:** Duelyst-style grid (6×4 in the current scaffold, 9×5 in the full design). Move via BFS pathfinding (orthogonal cost 1, diagonal cost 2). Attack adjacent enemies (8-way/Chebyshev distance 1) with symmetric counterattack. Turn-based: player turn → enemy AI turn.

**Hero (Guppy):** HP-based, base attack, active unit on the grid.

**Full design target:** overworld island map (Cross Blitz style) + 9×5 grid combat with mana-costed cards (Attack/Armor/Skill/Summon/Passive), draw/replace system, campaign progression — see wiki:specs:fish-tactical-rpg for the target design (tech references in that spec predate the Godot pivot; read them as "Godot/Rust equivalent").

## Current State (implemented)

- Godot 4 project (`godot/`) with a gdext Rust extension (`rust/`)
- Pure Rust core (`rust/src/core/`): battle, combat, grid modules — zero Godot dependencies, unit tested via `cargo test`
- Thin gdext bridge (`rust/src/bridge/`) drives the battle scene
- 6×4 grid battle scene (Guppy vs Debt Collector) — see wiki:specs:godot-battle-scaffold for locked decisions and acceptance criteria
- Web export path: build Rust → Godot headless export → serve/deploy — see wiki:specs:web-deploy-workflow

## Key Files

| Path | Purpose |
|------|---------|
| `rust/src/core/battle/` | Battle state machine, phases, results |
| `rust/src/core/combat/` | Base attack resolution |
| `rust/src/core/grid/` | Grid state, units, BFS movement |
| `rust/src/bridge/` | gdext bridge — `battle_scene.rs` connects core to Godot |
| `rust/src/lib.rs` | GDExtension entrypoint |
| `godot/scenes/battle/battle.tscn` | Battle scene |
| `godot/battle.gdextension` | Extension manifest |
| `wiki:specs:godot-battle-scaffold` | Current implementation spec |
| `wiki:specs:fish-tactical-rpg` | Target game design spec |

## Full Spec

@wiki/specs/godot-battle-scaffold (current implementation)
@wiki/specs/fish-tactical-rpg (target design)
