---
title: Grid Battle UI — render 9x5 grid, wire targeting, base attack, move, replace
type: task
tags:
- godot
- p0
- ui
- combat
- grid
status: done
priority: high
superseded_by: Grid UI implemented in Rust bridge (6×4 grid, alternating tiles, click-to-select, move overlay, attack highlight, base attack + move work; replace not applicable for current design). No orphaned deckbuilder-era UI.
acceptance_criteria:
- text: 9x5 grid renders in battle.tscn from core grid state
  checked: false
- text: Clicking a tile/unit selects valid targets per grid rules
  checked: false
- text: Base attack, move, and replace actions are reachable and functional from the UI
  checked: false
- text: Integration tests cover targeting, attack, move, and replace
  checked: false
- text: No orphaned old deckbuilder-era UI layout remains
  checked: false
assignee: you
---

Render the 9x5 battle grid in Godot (battle.tscn) using TileMap/GridContainer nodes, driven by core/grid/model/state.rs. Wire click-to-target input to base_attack.rs and movement.rs services in the Rust core, and implement the replace action. Restore integration tests against the grid.