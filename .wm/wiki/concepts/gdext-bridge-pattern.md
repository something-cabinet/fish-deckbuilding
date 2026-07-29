---
title: gdext Bridge Pattern
type: concept
tags: [godot, rust, gdext, architecture]
status: active
---

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

```
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

### Input handling: Use `_input()` over `_unhandled_input()` for GDExtension bridge scenes with CanvasLayer UI

**Problem:** Grid-based tactical games render visuals using Control nodes (ColorRect tiles, Panels, ProgressBars). The scene has a `CanvasLayer` for UI (buttons, labels, banners). Mouse clicks on the grid never reach `_unhandled_input()` because:

```
_input()              ← runs FIRST (CanvasLayer NOT yet processed)
    ↓
UI CanvasLayer nodes  ← _gui_input on Control nodes consumes events
    ↓
_unhandled_input()    ← runs LAST — grid clicks already consumed by CanvasLayer
```

The `CanvasLayer` processes input for its Control children before `_unhandled_input` fires on the base layer.

Even invisible Control nodes (e.g. a hidden `Panel` result banner) with `mouse_filter = STOP` will consume events before `_unhandled_input`.

**Solution:** Override `_input()` instead of `_unhandled_input()` on the bridge class. `_input()` fires BEFORE `_gui_input`, so CanvasLayer Control nodes cannot consume the event first.

```rust
// INode2D impl — NOT #[godot_api] impl BattleScene
fn input(&mut self, event: Gd<InputEvent>) {
    if self.animating { return; }
    let Ok(mouse) = event.try_cast::<InputEventMouseButton>() else { return };
    if !mouse.is_pressed() || mouse.get_button_index() != MouseButton::LEFT { return; }
    let Some(pos) = screen_to_grid(mouse.get_position()) else { return };
    self.handle_click(pos);
    // Do NOT call set_input_as_handled — let other nodes also process if needed
}
```

**Don't** try to fix this by setting `mouse_filter = IGNORE` on every visual Control node — you'll miss some (invisible panels, generated overlays). The `_input()` approach is simpler and always correct.

**When to use `_unhandled_input()` instead:**
- Gameplay key actions (jump, attack, interact) that should only fire when UI is NOT focused
- Actions that must respect modals and dialogs blocking input

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
            self.connect_signals();
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
    self.connect_signals();
}

fn connect_signals(&self) {
    let self_gd = self.to_gd();
    let end_btn = self.base().get_node_as::<Button>("UI/EndTurnButton");
    end_btn.signals().pressed().connect_other(&self_gd, BattleScene::on_end_turn);
}
```

### Scene File Requirements
- The root node type MUST match the native class: `type="BattleScene"` not `type="Node2D"` when the script `extends BattleScene`
- A thin GDScript bridge (`extends BattleScene` with no logic) is unnecessary — use the native type directly

### Known Issues
- `#[export]` fields survive reload (Godot serializes them). Non-exported fields reset.
- Typed signal connections auto-disconnect before reload but must be reconnected by handler.
- The `.dll`/`.so`/`.dylib` file is locked while Godot holds a reference — close the editor or stop the game before `cargo build`.
- Cross-platform: WASM hot-reload is not supported (Godot reloads the WASM binary, but the browser's caching model prevents it from working seamlessly).

### .tscn node type must be the custom class itself
- The scene's `[node type="..."]` must be set to the **custom GodotClass name** (e.g. `type="BattleScene"`), not the built-in base (`type="Node2D"`) with a GDScript stub.
- A script can only *add* behavior on top of the node's actual native type — it cannot narrow a plain `Node2D`.
- Symptom: `Script inherits from native type 'X', so it can't be assigned to an object of type: 'Y'`

## Related
- @wiki/tasks:godot-battle-07-hot-reload-fixes
- @wiki/specs:godot-battle-scaffold
- @wiki/decisions:godot-rust-gdext-pivot
- @wiki/concepts:gdext-scene-node-type-mismatch
