---
title: Godot Battle 07 - Hot-Reload Fixes & Parity
type: task
id: wiki:tasks:godot-battle-07-hot-reload-fixes
status: done
priority: high
tags: [godot, gdext, hot-reload, rust]
assignee: "@me"
acceptance_criteria:
  - text: "on_stage_init / on_stage_deinit hooks log reload lifecycle to console"
  - text: "EXTENSION_RELOADED notification handler reconnects typed signal bindings after reload"
  - text: "Missing export fields documented or added for state preservation"
  - text: "connect_other signal connections survive hot-reload"
  - text: "compatibility_minimum updated to 4.2+ if needed"
  - text: "Build pipeline documented for hot-reload workflow"
---

# Hot-Reload Fixes & Parity

Bring the godot-battle-scaffold Rust gdextension up to parity with the official godot-rust demo-projects/hot-reload example.

## Implementation

### Files Changed

| File | Change |
|------|--------|
| `rust/src/lib.rs` | Added `on_stage_init`/`on_stage_deinit` lifecycle hooks with `godot_print!` output |
| `rust/src/bridge/battle_scene.rs` | Added `on_notification` handler for `EXTENSION_RELOADED`, extracted `connect_signals()` from `ready()`, documented state preservation decision |
| `godot/battle.gdextension` | `compatibility_minimum` bumped 4.1 → 4.2 |
| `docs/HOT_RELOAD.md` | New file — full workflow documentation |

### Key Details

- **Lifecycle hooks**: `on_stage_init`/`on_stage_deinit` print to Godot console for reload visibility
- **EXTENSION_RELOADED handler**: Fires on existing `BattleScene` nodes after reload, calls `connect_signals()` and `sync_all()`
- **connect_signals()**: Extracted from `ready()`, called from both `ready()` and the reload handler
- **State preservation**: Documented that no `#[export]` fields are needed — battle state is ephemeral and resets on reload
- **compatibility_minimum**: 4.1 → 4.2 (hot-reload stabilized in 4.2+)
- **Build verified**: `cargo build` succeeds

### Parity with godot-rust demo

| Feature | Demo | fish-deckbuilding (now) |
|---------|:----:|:----------------------:|
| `reloadable = true` | ✅ | ✅ |
| Lifecycle hooks | ✅ | ✅ |
| `EXTENSION_RELOADED` handler | ❌ | ✅ |
| `#[export]` state fields | ✅ | ❌ (documented decision) |
| Signal reconnection | ❌ | ✅ |
| `compatibility_minimum` | 4.3 | 4.2 |

### Verification

- `cargo build` passes
- Open `godot/project.godot` in Godot 4.2+ editor to verify:
  - Lifecycle messages appear in Output panel
  - End Turn button works after hot-reload cycle
  - Lifecycle messages confirm library was reloaded
