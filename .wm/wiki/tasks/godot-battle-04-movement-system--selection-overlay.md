---
title: [godot-battle-04] Movement system + selection overlay
type: task
id: wiki:tasks:godot-battle-04-movement-system--selection-overlay
status: todo
priority: medium
tags: [from-spec, spec:godot-battle-scaffold, godot, movement]
spec: wiki:specs:godot-battle-scaffold
acceptance_criteria:
  - text: "AC-4: Clicking Guppy highlights all reachable tiles (BFS budget 2, enemy-occupied excluded)"
  - text: "AC-5: Click highlighted tile moves Guppy (tween ~200ms), consumes move, clears overlay"
  - text: "AC-6: Adjacent enemy shows attack highlight when selected; clicking resolves attack"
---

Wire BFS from core logic to visual layer. Click Guppy → show reachable tiles (translucent fill + corner brackets). Click reachable tile → move with tween. Deselect on right-click/elsewhere. Attack highlight on adjacent enemies.