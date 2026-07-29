---
title: Grid Battle UI — render 9x5 grid, wire targeting, base attack, move, replace
type: task
id: wiki:tasks:grid-battle-ui--render-9x5-grid-wire-targeting-base-attack-move-replace
status: todo
priority: high
tags: [godot, p0, ui, combat, grid]
acceptance_criteria:
  - text: "9x5 grid renders in battle.tscn from core grid state"
  - text: "Clicking a tile/unit selects valid targets per grid rules"
  - text: "Base attack, move, and replace actions are reachable and functional from the UI"
  - text: "Integration tests cover targeting, attack, move, and replace"
  - text: "No orphaned old deckbuilder-era UI layout remains"
---

Render the 9x5 battle grid in Godot (battle.tscn) using TileMap/GridContainer nodes, driven by core/grid/model/state.rs. Wire click-to-target input to base_attack.rs and movement.rs services in the Rust core, and implement the replace action. Restore integration tests against the grid.