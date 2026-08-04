---
title: Set up vitest test harness for the engine
type: task
tags:
- from-spec
- spec:card-effect-registry
status: done
priority: high
implementation_notes: 'T1 verified on disk 2026-08-03: vitest.config.ts created (node env, @ alias), src/lib/game/__tests__/engine.smoke.test.ts created, npm test → 3/3 green.'
relates_to:
- type: implements
  target: wiki:specs:card-effect-registry
acceptance_criteria:
- text: vitest is configured and `npm test` runs the engine test suite (AC-1)
  checked: true
- text: a trivial engine smoke test exists and passes
  checked: true
assignee: orchestrator
---

Spec: card-effect-registry (D2, NFR-1). No test harness exists in the JS app today. Configure vitest, add npm test script, add a trivial smoke test to prove the harness runs. Engine tests live in src/lib/game/__tests__/.