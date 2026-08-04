---
title: godot-battle-02-godot-project-scaffold--grid-rendering
type: task
status: archived
assignee: orchestrator
acceptance_criteria:
  - {text: "Archived 2026-08-04: dead Godot direction; superseded by Rust core implementation", checked: false}
---

---
title: [godot-battle-02] Godot project scaffold + grid rendering
type: task
id: wiki:tasks:godot-battle-02-godot-project-scaffold--grid-rendering
status: done
superseded_by: Grid rendered by Rust bridge (battle_scene.rs:build_grid) — 6×4 checkerboard tiles at 1280×720, Compatibility renderer. AC-1, NFR-3, NFR-1 fulfilled.
priority: high
tags: [from-spec, spec:godot-battle-scaffold, godot, scene]
spec: wiki:specs:godot-battle-scaffold
acceptance_criteria:
  - text: "AC-1: 6×4 grid renders centered at 1280×720 with alternating tile colors"
  - text: "NFR-3: Project renderer set to Compatibility"
  - text: "NFR-1: Runs at 60 FPS in editor"
---

Set up Godot 4 project at godot/ with Compatibility renderer, 1280×720 viewport. Create BattleScene root, BattleGrid with 24 Tile scenes (80×80 px), alternating chessboard colors, pixel-to-grid math in input handler.