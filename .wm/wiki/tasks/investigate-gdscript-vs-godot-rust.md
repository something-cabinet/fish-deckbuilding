---
title: Investigate GDScript vs godot-rust for scene scripting
type: task
tags:
- godot
- rust
- gdscript
- architecture
- investigation
status: done
implementation_notes: '## Acceptance Criteria 1. GDScript and godot-rust compared on compile time complexity 2. Web export feasibility evaluated 3. Team skill / onboarding curve assessed 4. Final recommendation with rationale documented'
acceptance_criteria:
- text: GDScript and godot-rust compared on compile time complexity
  checked: false
- text: Web export feasibility evaluated
  checked: false
- text: Team skill / onboarding curve assessed
  checked: false
- text: Final recommendation with rationale documented
  checked: false
assignee: you
---

## Goal
Evaluate whether the remaining Godot scene scripting should use GDScript or continue with godot-rust (gdext). The Rust core (52 tests, 8 modules) stays regardless — this is about the scene layer: input handling, scene tree updates, signal wiring, tweens.

## Context
Current state:
- `bridge/battle_scene.rs` — 518 lines of gdext Rust for scene management
- `.gd` shim file — one-liner `extends BattleScene`
- Rust compile times are significant (~16s) compared to GDScript's instant iteration
- gdext 0.5.4 API: typed signals work for built-in nodes, `create_tween` returns `Gd<Tween>`

## Candidates

### Option A: Keep gdext for everything (current)
- All logic in Rust, zero GDScript
- One compile target, no language switch
- Compile times hurt iteration speed for scene tweaks (position, color, timing)
- Godot editor hot-reload works but requires recompile
- Typed signals available (0.5.4+)
- Full Rust type safety in scene code

### Option B: GDScript for scene layer, Rust for core
- `core/` stays pure Rust (52 tests)
- Scene scripts (battle_scene, tiles, HUD) in GDScript
- GDScript calls into Rust extension for game actions
- Instant iteration for visual/UX changes
- Two languages to maintain
- GDScript lacks compile-time checks for signal connections

## Evaluation criteria
- Iteration speed for scene tweaks
- Build complexity (single vs dual language)
- Type safety in scene glue code
- Error surface area (GDScript runtime errors vs Rust compile errors)
- Team familiarity and hiring

## Related
- @wiki/decisions:godot-rust-gdext-pivot
- @wiki/specs:godot-battle-scaffold
- @wiki/concepts:gdext-bridge-pattern