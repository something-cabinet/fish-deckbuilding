---
title: gdext Bridge Pattern
type: concept
tags: [godot, rust, gdext, architecture]
status: active
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

## Hot-Reload Support

godot-rust gdext supports hot-reloading in Godot 4.2+ when configured correctly.

### Configuration
- `reloadable = true` in `.gdextension` file enables library watching
- `compatibility_minimum = 4.2` minimum for reliable hot-reload
- `cdylib` crate type in `Cargo.toml` produces the loadable binary

### Lifecycle Hooks
Add `on_stage_init`/`on_stage_deinit` to the `ExtensionLibrary` impl for console visibility:

```rust
#[gdextension]
unsafe impl ExtensionLibrary for FishBattleExtension {
    fn on_stage_init(stage: InitStage) {
        godot_print!("[gdext] init stage {stage:?}");
    }
    fn on_stage_deinit(stage: InitStage) {
        godot_print!("[gdext] deinit stage {stage:?}");
    }
}
```

### EXTENSION_RELOADED Handler
`_ready()` does NOT re-fire after hot-reload. Use `on_notification` to reinitialize:

```rust
#[godot_api]
impl INode2D for BattleScene {
    fn on_notification(&mut self, what: CanvasItemNotification) {
        if what == CanvasItemNotification::EXTENSION_RELOADED {
            // Reconnect typed signals (Godot auto-disconnects them before reload)
            self.connect_signals();
            // Refresh UI state
            self.sync_all();
        }
    }
}
```

### Signal Reconnection Pattern
Extract signal wiring from `ready()` into a shared method:

```rust
fn ready(&mut self) {
    self.build_grid();
    self.build_ui();
    self.start_battle();
    self.connect_signals();  // call in ready()
}

fn connect_signals(&self) {
    let self_gd = self.to_gd();
    let end_btn = self.base().get_node_as::<Button>("UI/EndTurnButton");
    end_btn.signals().pressed().connect_other(&self_gd, BattleScene::on_end_turn);
    // ... more signal bindings
}
```

### Scene File Requirements
- The root node type MUST match the native class: `type="BattleScene"` not `type="Node2D"` when the script `extends BattleScene`
- A thin GDScript bridge (`extends BattleScene` with no logic) is unnecessary — use the native type directly
- Full workflow: `@wiki/docs/HOT_RELOAD.md`

### Known Issues
- `#[export]` fields survive reload (Godot serializes them). Non-exported fields reset.
- Typed signal connections auto-disconnect before reload but must be reconnected by handler.
- The `.dll`/`.so`/`.dylib` file is locked while Godot holds a reference — close the editor or stop the game before `cargo build`.
- Cross-platform: WASM hot-reload is not supported (Godot reloads the WASM binary, but the browser's caching model prevents it from working seamlessly).

See `@wiki/docs/HOT_RELOAD.md` for the full workflow guide.

## Related
- @wiki/tasks:godot-battle-07-hot-reload-fixes
- @wiki/docs/HOT_RELOAD.md
- @wiki/specs:godot-battle-scaffold
- @wiki/decisions:godot-rust-gdext-pivot
- @wiki/patterns:comment-to-function-extraction
