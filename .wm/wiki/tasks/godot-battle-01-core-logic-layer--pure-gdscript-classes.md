---
title: [godot-battle-01] Core logic layer — pure GDScript classes
type: task
id: wiki:tasks:godot-battle-01-core-logic-layer--pure-gdscript-classes
status: todo
priority: high
tags: [from-spec, spec:godot-battle-scaffold, godot, core]
spec: wiki:specs:godot-battle-scaffold
acceptance_criteria:
  - text: "AC-4: BFS range computation (budget 2, ortho 1, diag 2, enemy blocks landing/pass-through)"
  - text: "AC-7: Base attack + symmetric counterattack logic (survivor counters)"
  - text: "AC-9: Enemy AI determinism (Chebyshev distance min, lowest-y lowest-x tie-break)"
  - text: "AC-12: GdUnit4 tests for movement BFS, combat, AI determinism, turn reset pass headless"
---

Implement all pure logic classes in godot/src/core/ as RefCounted with zero Node imports: grid_state, grid_unit, grid_movement (BFS), combat (base attack/counter), battle_state, battle_engine, enemy_ai. Write GdUnit4 tests first (TDD).