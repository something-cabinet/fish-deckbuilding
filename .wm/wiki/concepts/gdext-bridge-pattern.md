---
---

## Problem
How to organize Rust code that needs to call Godot APIs while keeping game logic pure and testable.

## Solution
Separate into three layers:

```text
core/           Pure Rust — tested with cargo test
  grid/         Grid domain: types, state, BFS
  combat/       Combat domain: attack resolution
  battle/       Battle domain: turn engine, AI, state machine

bridge/         gdext classes — thin Godot integration
  battle_scene.rs  Inherits Node2D, handles input/sync, calls core
```

The bridge layer:
- Inherits Godot node types via `#[derive(GodotClass)]`
- Handles all Godot API calls (creating nodes, signals, tweens)
- NEVER contains game logic — delegates to core

## gdext Key Patterns

### Object creation
- `ColorRect::new_alloc()` creates new visual nodes
- `StyleBoxFlat::new_gd()` creates resource objects (not `new_alloc()`)

### Scene tree access
- `get_node_as::<T>(path)` returns `Gd<T>` directly (panics on type mismatch — use correct type: `CanvasLayer` not `Node2D`)
- `try_cast::<T>()` returns `Result<Gd<T>, Gd<InputEvent>>`

### Tweens (godot 0.5.4)
- `create_tween()` returns `Gd<Tween>` directly (not `Option<Gd<Tween>>` as in 0.2)
- Create tween AFTER node is added to scene tree, or it returns null
- `tween_property(&node, "scale", &variant, duration)` takes `&Gd<Node2D>`

### Signals (godot 0.5.4)
- Built-in nodes expose typed signals via `Gd<T>::signals()`
- `connect_other(&target_gd, Target::handler)` for handler on different object
- String-based `.connect("signal", &callable)` is the old pattern — use typed signals when available

### Class registration
- `#[derive(GodotClass)] #[class(base=Node2D)]` + `#[godot_api] impl INode2D`
- `#[func]` exposes methods to Godot signals
- `#[signal]` declares custom signals
- `unsafe impl ExtensionLibrary` required for entry point

## Related
- @wiki/specs:godot-battle-scaffold
- @wiki/decisions:godot-rust-gdext-pivot
- @wiki/patterns:comment-to-function-extraction
