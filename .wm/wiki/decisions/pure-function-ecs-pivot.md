---
{}
relates_to:
  - {type: references, target: wiki:tasks:rewrite-combat-into-excalibur-ecs-with-events}
---

---
title: Decision: Pure Function Combat Architecture → Excalibur ECS
type: decision
id: wiki:decisions:pure-function-ecs-pivot
status: approved
tags: [decision, architecture, ecs, excalibur]
---

## Context
The game's combat logic was initially written as pure TypeScript functions (CombatController, CoinSystem, TurnFlow, GridCombat, etc.) with Svelte 5 `$state` runes as the reactive state layer. This worked well — 79 tests passed, 0 P0 bugs in the pure function layer. However, the Svelte/UI wiring code (BattleHUD.svelte) accumulated all 7 P0 bugs across 3 Oracle reviews because it was untested.

## Decision
Phase 1-3c was built with pure functions + Svelte $state. The final phase (ECS rewrite) moves ALL game logic into Excalibur's built-in ECS with EventEmitter driving state changes. Svelte becomes a pure UI subscriber.

## Rationale
- Pure functions were excellent for testability (79 tests, 0 P0s) — this pattern validated
- The untested UI orchestration layer was the single source of all P0 bugs
- Excalibur's ECS + events is the canonical pattern for Excalibur games
- Turn-based games don't need ECS for performance, but the architectural clarity of event-driven state is valuable
- Svelte (or React via Next.js) as a pure UI subscriber cleanly separates concerns

## Consequences
- All 79 tests need to be rewritten against Excalibur systems
- Svelte components change from state owners to event subscribers
- Can switch between Svelte and React/Next.js without changing game logic
- Pure function pattern was correct for rapid prototyping — the ECS pivot is an architectural hardening step, not a bug fix

## Related
- @task-tasks:rewrite-combat-into-excalibur-ecs-with-events