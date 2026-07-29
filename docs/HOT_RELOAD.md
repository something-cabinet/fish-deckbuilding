# Hot-Reload Workflow (godot-rust gdext)

The Godot battle scaffold supports **hot-reloading** of the Rust gdextension library
in Godot 4.2+.  When you recompile `cargo build`, the editor detects the changed
binary and reloads it without restarting.

## Workflow

```bash
# Terminal 1: Godot editor
cd godot
godot4 project.godot          # or open via editor UI

# Terminal 2: Rust compilation
cd rust
cargo build                    # debug build
```

1. Open `godot/project.godot` in Godot 4.2+ editor
2. The `battle.gdextension` is loaded automatically — confirm no errors in Output panel
3. Make changes to Rust code in `rust/src/`
4. Run `cargo build` from `rust/`
5. **Alt-tab back to the Godot editor** → hot-reload triggers automatically
6. Check the Output panel for `[gdext]` lifecycle messages confirming reload

## Lifecycle Log Messages

| Event | Console Output |
|-------|---------------|
| Initial load | `[gdext] init stage Scene` |
| Hot-reload unload | `[gdext] deinit stage Scene` |
| Hot-reload load | `[gdext] init stage Scene` |
| BattleScene reload | `[BattleScene] EXTENSION_RELOADED — reconnecting signals + refreshing UI` |

If you don't see these messages, the reload didn't trigger — see
[Troubleshooting](#troubleshooting).

## What Survives Reload

| Item | Survives? | Notes |
|------|-----------|-------|
| Scene tree structure | ✅ | Nodes stay in place |
| Exported properties | ⚠️ | None currently — see `#[export]` note below |
| Signal connections | ✅ | Reconnected via `EXTENSION_RELOADED` handler |
| Game state (BattleState) | ❌ | Resets to `start_battle()` defaults |
| UI elements | ❌ | Rebuilt via `sync_all()` after reload |

## What the Demo Does vs What We Do

| Feature | godot-rust demo | This project |
|---------|:---------------:|:------------:|
| `reloadable = true` | ✅ | ✅ |
| Lifecycle hooks | ✅ `on_stage_init/deinit` | ✅ |
| `EXTENSION_RELOADED` handler | ❌ (too simple) | ✅ |
| `#[export]` state fields | ✅ | ❌ (not needed for prototype) |
| Signal reconnection | ❌ (no signals) | ✅ |
| `compatibility_minimum` | 4.3 | 4.2 |

## `#[export]` Fields

The `BattleScene` struct has **no `#[export]` fields**.  All game state is
ephemeral: the scene initialises from scratch in `init()` / `start_battle()`.
This means hot-reload always resets the battle.

If mid-battle state preservation across reloads is needed later:
1. Add `#[export]` and `#[init(val = ...)]` on the struct fields
2. Godot serialises them before unloading the old library
3. They are restored onto the fresh instance after reload

For now the reset behaviour is acceptable — this is a tactical prototype.

## How It Works

1. `reloadable = true` in `godot/battle.gdextension` tells Godot to watch the
   `.dll`/`.so`/`.dylib` file for changes
2. When the editor regains focus after a `cargo build`, Godot detects the
   modified binary
3. Godot saves `#[export]` fields, unloads the old library (`on_stage_deinit`),
   loads the new library (`on_stage_init`), and creates fresh instances via `init()`
4. The `EXTENSION_RELOADED` notification fires on each existing node →
   `connect_signals()` re-binds typed signal closures, and `sync_all()` refreshes
   the UI
5. `_ready()` does **not** re-fire — all re-initialisation logic lives in the
   notification handler instead

## Troubleshooting

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| No `[gdext]` messages in Output | Godot < 4.2 or `reloadable` not set | Verify `godot/battle.gdextension` has `reloadable = true` and `compatibility_minimum = 4.2` |
| "Extension not loaded" errors | First `cargo build` not run, or binary path wrong | Run `cargo build` from `rust/`, verify paths in `.gdextension` match `target/` layout |
| Buttons unresponsive after reload | Signal connections lost | Ensure `EXTENSION_RELOADED` handler calls `connect_signals()` |
| Editor crashes on reload | `lazy-function-tables` + threading conflict | See godot-rust#1102 — try removing `lazy-function-tables` feature |
| Scene doesn't load | GDScript bridge expects old API | Restart Godot editor |

## References

- [godot-rust book: Hot Reload](https://godot-rust.github.io/book/recipes/hot-reload.html)
- [godot-rust demo-projects / hot-reload](https://github.com/godot-rust/demo-projects/tree/master/hot-reload)
- `@wiki/memory/gdext-0-5-4-api-gotchas` — typed signals, get_node_as, etc.
- `@wiki/memory/godot-rust-gdext-bridge-pattern` — thin scene layer design
