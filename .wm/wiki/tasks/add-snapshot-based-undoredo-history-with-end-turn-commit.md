---
title: Add snapshot-based undo/redo history with End-Turn commit
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
- text: every player action has an execute→undo round-trip test restoring exact pre-action state (AC-9)
  checked: false
- text: 'undo history semantics: walk back through player phase; new action after undo clears redo (AC-10)'
  checked: false
- text: End Turn clears history; enemy-phase steps never appear in undo stack (AC-11)
  checked: false
---

Spec: card-effect-registry (FR-10, FR-11, D10). Snapshot stack (Memento): execute pushes pre-action GameState snapshot; undo restores; new action after undo discards redo tail (AC-9, AC-10). Undo covers player-phase actions only (move/attack/play/sell/buy). End Turn commits: executes through the command base but clears history; enemy-phase steps never enter the undo stack (AC-11).