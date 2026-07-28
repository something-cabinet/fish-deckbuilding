---
title: [godot-battle-03] Unit system + placement
type: task
id: wiki:tasks:godot-battle-03-unit-system--placement
status: todo
priority: medium
tags: [from-spec, spec:godot-battle-scaffold, godot, units]
spec: wiki:specs:godot-battle-scaffold
acceptance_criteria:
  - text: "AC-2: Guppy (30 HP, 2 ATK) at (0,2); Debt Collector (10 HP, 2 ATK) at (5,1); HP visible"
  - text: "AC-3: At player-turn start, Guppy shows pulse indicator iff hasMoved==false"
---

Create Unit scene with placeholder body sprite, HP label, action-ready indicator (pulsing glow). Extend for Guppy and Debt Collector. Place them at (0,2) and (5,1). HP visible on both. Action-ready indicator shows when unit hasn't moved.