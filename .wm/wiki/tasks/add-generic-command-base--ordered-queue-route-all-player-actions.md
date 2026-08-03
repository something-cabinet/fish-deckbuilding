---
title: Add generic command base + ordered queue; route all player actions
type: task
tags:
- from-spec
- spec:card-effect-registry
status: in-progress
priority: high
relates_to:
- type: implements
  target: wiki:specs:card-effect-registry
acceptance_criteria:
- text: every player action routes through the generic command base (FR-8)
  checked: false
- text: 'deterministic queue: same enqueue sequence → identical resulting state (AC-12)'
  checked: false
- text: no per-action command classes; command base is generic (AC-13)
  checked: false
- text: enemy phase routes through the same command shape
  checked: false
---

Spec: card-effect-registry (FR-8, FR-9, FR-12, D7, D9, NFR-8). Generic Command interface (execute/undo) wrapping every player action — move, attack, play card, sell, buy, end turn. No per-action command classes (AC-13); commands parameterized by data. Ordered queue executes deterministically (AC-12, NFR-8). Enemy-phase steps (EnemyStep) conform mechanically to the same command shape. Hook/UI contract unchanged — gestures enqueue commands, pipeline emits state + fx (FR-12).