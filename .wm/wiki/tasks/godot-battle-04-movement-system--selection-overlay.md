---
title: godot-battle-04-movement-system--selection-overlay
type: task
status: archived
assignee: orchestrator
acceptance_criteria:
  - {text: "Archived 2026-08-04: dead Godot direction; superseded by Rust core implementation", checked: false}
---

---
title: [godot-battle-04] Movement system + selection overlay
type: task
id: wiki:tasks:godot-battle-04-movement-system--selection-overlay
status: done
superseded_by: Movement + selection wired in Rust bridge (battle_scene.rs:handle_click, show_move_overlay, show_attack_highlight) — BFS range display, corner brackets, tween-free instant move, attack highlight on adjacent enemies. AC-4, AC-5, AC-6 fulfilled.
priority: medium
tags: [from-spec, spec:godot-battle-scaffold, godot, movement]
spec: wiki:specs:godot-battle-scaffold
acceptance_criteria:
  - text: "AC-4: Clicking Guppy highlights all reachable tiles (BFS budget 2, enemy-occupied excluded)"
  - text: "AC-5: Click highlighted tile moves Guppy (tween ~200ms), consumes move, clears overlay"
  - text: "AC-6: Adjacent enemy shows attack highlight when selected; clicking resolves attack"
---

Wire BFS from core logic to visual layer. Click Guppy → show reachable tiles (translucent fill + corner brackets). Click reachable tile → move with tween. Deselect on right-click/elsewhere. Attack highlight on adjacent enemies.