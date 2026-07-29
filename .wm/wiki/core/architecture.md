---
title: Fish Roguelite Deckbuilding — Architecture
type: core
tags: [core, architecture]
---

---
title: Fish Tactical RPG — Architecture
type: core
tags: [core, architecture]
---

## Stack

| Layer | Technology | Role |
|-------|-----------|------|
| Engine | **Godot 4** | Scene tree, rendering (gl_compatibility for web export), input |
| Scripting/logic | **godot-rust (gdext 0.5)** | Rust cdylib loaded via GDExtension; all game logic, no GDScript except a one-line scene shim |
| Core domain | **Pure Rust** (`rust/src/core/`) | battle, combat, grid — zero Godot dependencies, unit tested |
| Bridge | **gdext bridge** (`rust/src/bridge/`) | Connects pure core to Godot nodes/signals; e.g. `battle_scene.rs` |
| Language | **Rust** | Strict typing, enums for Faction/Phase/Decision, `Result` for fallible ops |
| Testing | **cargo test** | Unit tests on the pure core (see wiki:specs:godot-battle-scaffold for current count) |
| Web export | **Godot headless export → static hosting** | See wiki:specs:web-deploy-workflow |

Superseded stack (retired): Excalibur.js + Svelte 5 + TypeScript + Vite + Vitest + localStorage. See wiki:decisions:godot-rust-gdext-pivot for the pivot rationale and wiki:memory:godot-migration-analysis-stay-on-web-stack (archived) for the earlier analysis that was overridden.

## Architecture Pattern

```
Godot 4 scene tree (godot/scenes/battle/battle.tscn)
  - Node2D grid, instanced tiles
  - Input handled via _input() (not _unhandled_input(), see wiki:memory:gdextension-click-input-use-_input-over-_unhandled_input)
        |
gdext bridge (rust/src/bridge/battle_scene.rs)
  - #[derive(GodotClass)] node wrapping the pure core
  - Reads Godot input, calls core services, writes results back to scene state
        |
Pure Rust core (rust/src/core/)
  - battle/  — state machine, phases, results (model + service split)
  - combat/  — base attack resolution
  - grid/    — grid state, units, BFS movement/pathfinding
  - No Godot dependency; testable standalone via `cargo test`
```

## File Structure

```
rust/
├── src/
│   ├── lib.rs                  # GDExtension entrypoint (on_stage_init/deinit)
│   ├── bridge/
│   │   ├── mod.rs
│   │   └── battle_scene.rs     # gdext node driving the battle scene
│   └── core/
│       ├── constants.rs
│       ├── battle/
│       │   ├── model/          # battle_state.rs, battle_result.rs, phase.rs
│       │   ├── service/        # engine.rs
│       │   └── ai/             # decide.rs
│       ├── combat/
│       │   ├── model/          # attack_result.rs, attack_error.rs
│       │   └── service/        # base_attack.rs
│       └── grid/
│           ├── model/          # state.rs, unit.rs
│           └── service/        # movement.rs
├── Cargo.toml                  # crate-type = cdylib, godot = "0.5"
godot/
├── project.godot
├── battle.gdextension          # points Godot at the compiled cdylib
├── scenes/battle/battle.tscn
└── addons/runtime_test/        # in-editor test/diagnostic plugin
```

## Key Architectural Decisions

| Decision | Status | Doc |
|----------|--------|-----|
| Pivot from Excalibur.js/Svelte to Godot 4 | Approved | @wiki/decisions/godot-rust-gdext-pivot |
| Pivot from GDScript to godot-rust (gdext) for all logic | Approved | @wiki/decisions/godot-rust-gdext-pivot |
| Godot battle scaffold — 6×4 grid, BFS movement, symmetric counterattack | Approved (Phase 1 done) | @wiki/specs/godot-battle-scaffold |
| Web deploy: Rust → Godot headless export → static host | Draft | @wiki/specs/web-deploy-workflow |
| Target design: overworld + 9×5 grid combat (Godot/Rust re-target pending) | Approved (design), stale tech refs | @wiki/specs/fish-tactical-rpg |
| TDD + SDD workflow | Enforced | @wiki/rules/tdd, @wiki/rules/spec-driven-development |

## Full Spec

@wiki/specs/godot-battle-scaffold (current implementation baseline)
@wiki/specs/fish-tactical-rpg (target game design — tech sections predate the Godot pivot)
