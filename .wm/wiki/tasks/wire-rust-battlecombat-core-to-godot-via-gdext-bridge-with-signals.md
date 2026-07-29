---
title: Wire Rust battle/combat core to Godot via gdext bridge with signals
type: task
id: wiki:tasks:wire-rust-battlecombat-core-to-godot-via-gdext-bridge-with-signals
status: todo
priority: high
tags: [godot, gdext, rust, architecture]
acceptance_criteria:
  - text: "Core state changes (grid, combat, battle) emit typed Godot signals via the bridge"
  - text: "battle.tscn subscribes to bridge signals and reflects state changes"
  - text: "Movement, base attack, and AI decisions surface through bridge_battle_scene.rs"
  - text: "Existing Rust core unit tests still pass"
  - text: "Playable end-to-end from the Godot editor"
---

Connect the Rust core (core/battle, core/combat, core/grid services) to Godot scenes through the gdext bridge (bridge/battle_scene.rs, battle.gdextension). Emit Godot signals on state changes so battle.tscn and its UI nodes can subscribe reactively, replacing the abandoned Excalibur/Svelte ECS rewrite approach.