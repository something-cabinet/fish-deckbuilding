---
title: Full integration verification — build green, parity, determinism
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
- text: npm run build green (AC-15)
  checked: false
- text: custom-card flow unchanged — creator/library still function, custom cards display-only (AC-14)
  checked: false
- text: 'deterministic replay: same enqueue sequence on fresh states → identical results (AC-12, Scenario 12)'
  checked: false
- text: full test suite green
  checked: false
---

Spec: card-effect-registry (NFR-2/4/8, AC-12/14/15). Final wave: run full vitest suite (all parity + command + undo + schema tests), npm run build green, custom-card flow (creator/library) unchanged and display-only, deterministic replay test, SDD validation.