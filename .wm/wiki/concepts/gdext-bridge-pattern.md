---
title: Concept: gdext Bridge Pattern — Thin Scene Layer
type: concept
id: wiki:concepts:gdext-bridge-pattern
tags: [concept, godot, rust, architecture, bridge]
---

## Problem
How to organize Rust code that needs to call Godot APIs while keeping game logic pure and testable.

## Solution
Separate into three layers:

```text
core/           # Pure Rust — no godot dependency, tested with cargo test
  grid/         #   Grid domain: types, state, BFS
  combat/       #   Combat domain: attack resolution
  battle/       #   Battle domain: turn engine, AI, state machine

bridge/         # gdext classes — thin Godot integration
  battle_scene.rs  # Inherits Node2D, handles input/sync, calls core
```

The bridge layer:
- Inherits Godot node types via `#[derive(GodotClass)]`
- Handles all Godot API calls (creating nodes, signals, tweens)
- NEVER contains game logic — delegates to core
- Syncs via read-compute-apply cycle (read state, compute via core, apply to scene tree)

## gdext Key Patterns
- `ColorRect::new_alloc()` creates new nodes
- `StyleBoxFlat::new_gd()` creates resource objects (not `new_alloc()`)
- `create_tween()` returns `Option<Gd<Tween>>` — unwrap carefully
- `get_node_as::<T>(path)` returns `Gd<T>` directly (panics if not found)
- `try_cast::<T>()` returns `Result<Gd<T>, Gd<InputEvent>>` (not Option)
- `tween_property(&node, "scale", &Variant, duration)` takes `&Gd<Node2D>`
- `#[derive(GodotClass)] #[class(base=Node2D)]` + `#[godot_api] impl INode2D` is the standard class pattern
- `#[func]` on methods makes them callable from Godot signals

## Related
- @wiki/specs:godot-battle-scaffold
- @wiki/decisions:godot-rust-gdext-pivot
