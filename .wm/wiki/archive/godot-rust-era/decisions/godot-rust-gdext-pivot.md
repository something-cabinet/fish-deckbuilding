---
title: Decision: Pivot from GDScript to godot-rust gdext
type: decision
id: wiki:decisions:godot-rust-gdext-pivot
status: approved
tags: [decision, godot, rust, architecture]
---

## Context
The Godot battle scaffold was initially built with GDScript for the scene layer and core logic. After building the initial GDScript prototype, the user chose to pivot to Rust via the godot-rust gdext bindings for the ecosystem benefits: compiler-driven development, type safety, and testing infrastructure.

## Decision
Use godot-rust (gdext 0.2) for ALL game logic. GDScript is used only for a one-line `extends BattleScene` shim in the scene file. The Rust code compiles as a cdylib loaded by Godot 4 via GDExtension.

## Rationale
- **Compiler-Driven Development**: Rust's type system (enums for Faction/Phase/Decision, Result for fallible operations) catches game rule violations at compile time
- **TDD**: `cargo test` runs 52 tests in 0.00s — far faster than GdUnit4
- **Pure core**: Game logic lives in `core/` with zero godot dependencies, testable standalone
- **Zero unsafe**: Outside the required `unsafe impl ExtensionLibrary`, there are zero unsafe blocks

## Consequences
- Scene files (.tscn) use a `.gd` shim (`extends BattleScene`) that's registered via `#[derive(GodotClass)]`
- Godot must be opened from the terminal to see Rust compile errors: `godot4 --path godot/`
- `cargo build` produces a .dylib/.so/.dll that Godot loads; no copy step needed if .gdextension paths are correct
- Compat renderer (`gl_compatibility`) must be set in project.godot for web export

## Related
- @wiki/specs:godot-battle-scaffold
