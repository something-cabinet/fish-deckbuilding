---
title: Decision: Rust gdext Bridge Over GDScript for Scene Layer
type: decision
status: approved
tags: [decision, godot, gdext, rust, architecture]
---

## Context
The battle system was initially planned with GDScript scene classes (godot-battle-01 through 07) implementing core logic in `godot/src/core/`. The Rust core (grid, combat, battle engine) was intended to be called from GDScript via gdext signals.

## Decision
Implement the entire scene layer — including grid rendering, unit display, input handling, and UI — in Rust via the gdext bridge (`rust/src/bridge/battle_scene.rs`), using zero GDScript beyond a one-line `extends BattleScene` shim.

## Rationale
- Avoids GDScript ↔ Rust context switching during hot-reload cycles
- Single language for all game logic (Rust) simplifies debugging and testing
- The gdext bridge provides full access to Godot's scene tree and signal system
- GDScript classes would have duplicated the logic already implemented in Rust
- Reduces the number of files and modules to maintain

## Consequences
- Hot-reload requires the Rust bridge to re-connect signals manually (handled via `EXTENSION_RELOADED` notification)
- Visual UI elements must be created procedurally in Rust code rather than designed in the Godot editor
- GDScript-only developers cannot easily modify the scene layer
- The 7 godot-battle-* tasks were marked as superseded since their GDScript approach was never used

## Related
- @wiki:tasks:godot-battle-01 through 07 (superseded)
- @wiki:tasks:wire-rust-battlecombat-core-to-godot-via-gdext-bridge-with-signals