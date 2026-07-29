---
title: gdext hot-reload signal reconnection
type: memory
tags: [godot, rust, gdext, hot-reload]
status: active
---

gdext 0.5 hot-reload needs: `reloadable=true` in .gdextension, `compatibility_minimum=4.2`, `on_stage_init/deinit` hooks in ExtensionLibrary impl, and `on_notification(EXTENSION_RELOADED)` handler to reconnect typed signals after reload. Extract signal wiring from `ready()` into a shared method called from both `ready()` and the handler. Scene node type must match the native class (`type="BattleScene"` not `type="Node2D"`). Full ref: @wiki/concepts/gdext-bridge-pattern
