---
title: Implement effect resolver (exhaustive match + custom registry)
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
- text: resolver applies all 6 primitives + custom dispatch, exhaustive (FR-4, AC-7)
  checked: false
- text: multi-effect cards resolve in order, same combined outcome (kneecap, loan_shark) (AC-5)
  checked: false
- text: 'custom registry: registered handler resolves; unknown handlerId fails loudly at load; zero custom handlers ship (AC-17)'
  checked: false
---

Spec: card-effect-registry (FR-2, FR-4, FR-5, FR-14, D5, D11). Implement the resolver: applies each effect in order, mutating state, producing same FxEvent[] + log entries as today. Exhaustive match over CardEffect union. Custom-effect escape hatch: dispatch {kind:'custom', handlerId} to a registry; unknown handlerId fails loudly at load/registry validation (FR-14, AC-17); zero custom handlers ship initially. Multi-effect order preserved (FR-5, AC-5). Pure engine, zero React deps (NFR-3).