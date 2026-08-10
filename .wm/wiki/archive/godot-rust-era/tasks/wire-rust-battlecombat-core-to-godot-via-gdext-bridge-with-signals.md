---
title: Wire Rust battle/combat core to Godot via gdext bridge with signals
type: task
tags:
- godot
- gdext
- rust
- architecture
status: done
priority: high
superseded_by: Bridge implemented in rust/src/bridge/battle_scene.rs (603 lines) — state changes sync via direct sync_all/sync_visuals_ref/sync_ui_ref rather than Godot signals. Playable end-to-end from editor. Core tests pass.
acceptance_criteria:
- text: Core state changes (grid, combat, battle) emit typed Godot signals via the bridge
  checked: false
- text: battle.tscn subscribes to bridge signals and reflects state changes
  checked: false
- text: Movement, base attack, and AI decisions surface through bridge_battle_scene.rs
  checked: false
- text: Existing Rust core unit tests still pass
  checked: false
- text: Playable end-to-end from the Godot editor
  checked: false
assignee: you
---

Connect the Rust core (core/battle, core/combat, core/grid services) to Godot scenes through the gdext bridge (bridge/battle_scene.rs, battle.gdextension). Emit Godot signals on state changes so battle.tscn and its UI nodes can subscribe reactively, replacing the abandoned Excalibur/Svelte ECS rewrite approach.