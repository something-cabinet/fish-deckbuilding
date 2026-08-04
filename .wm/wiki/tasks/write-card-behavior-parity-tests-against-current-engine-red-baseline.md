---
title: Write card-behavior parity tests against current engine (red baseline)
type: task
tags:
- from-spec
- spec:card-effect-registry
status: done
priority: high
relates_to:
- type: implements
  target: wiki:specs:card-effect-registry
acceptance_criteria:
- text: each of the 9 cards has a test asserting its exact current effect outcome (AC-2)
  checked: true
- text: unplayable casts (wrong target, insufficient mana, wrong phase) return unchanged state — tests cover this (AC-6)
  checked: true
- text: all parity tests pass against the current switch implementation (oracle baseline)
  checked: true
assignee: orchestrator
---

Spec: card-effect-registry (D4 oracle, NFR-2). Capture the CURRENT castCard switch behavior for all 9 cards as tests against the existing engine — these tests pass against today's code and become the parity oracle the refactor must keep green. Cover damage amounts, heals, draw counts, coin gains, summon stats, fx events, log text, and validation rejects (AC-2, AC-6 partial).