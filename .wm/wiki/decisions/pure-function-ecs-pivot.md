---
implementation_notes: Updated to reflect actual dual-layer outcome (pure functions + ECS orchestration, not full rewrite).
---

---
title: Decision: Dual Layer — Pure Functions + ECS Orchestration
type: decision
status: completed
tags: [decision, architecture, ecs, excalibur]
---

## Context
The game's combat logic was initially written as pure TypeScript functions (CombatController, CoinSystem, TurnFlow, etc.) with Svelte 5 `$state` runes as the reactive state layer. This worked well — 79 tests passed, 0 P0 bugs in the pure function layer. However, the Svelte/UI wiring code (BattleHUD.svelte) accumulated all 7 P0 bugs across 3 Oracle reviews because it was untested.

The original plan was to rewrite ALL game logic into Excalibur ECS Systems, replacing the pure functions entirely.

## Decision
**Dual layer architecture**: Pure functions stay as the testable domain logic layer. An Excalibur ECS orchestrator (CombatOrchestrator) coordinates turn flow, owns entities with components, and emits events through a typed EventBus. A bridge layer syncs events to Svelte `$state` reactively.

Not chosen: Full ECS rewrite (pure functions → Excalibur Systems). Pure functions provide better testability for deterministic computations (Keywords, Effects, CoinSystem arithmetic). ECS Systems are better suited for per-frame visual behaviors.

## Rationale
- Pure functions were excellent for testability (79 tests, 0 P0s) — this pattern was validated
- The untested UI orchestration layer was the single source of all P0 bugs
- Oracle review confirmed: "Layering concept (pure functions ← orchestrator ← typed event bus ← bridge ← Svelte) is sound"
- Snapshot-based sync (state:changed) proved more reliable than per-field granular events — the initial granular approach caused 5 P0 desyncs
- ECS entities provide the right state management pattern; per-frame Systems are unnecessary for turn-based games

## Consequences
- **Positive**: Pure functions remain testable independently; 79 existing tests preserved; orchestration layer now has 13 integration tests
- **Positive**: Svelte is a thin subscriber — the bridge layer could be adapted for React without changing game logic
- **Positive**: ECS components make entity state explicit and typed
- **Negative**: ECS ceremony without Systems (entities never added to a World) is overhead without full benefit — a known tradeoff accepted for architectural consistency
- **Negative**: Dual layer means two testing strategies — pure function unit tests + orchestrator integration tests

## Related
- @task-tasks:rewrite-combat-into-excalibur-ecs-with-events
- @wiki/patterns/snapshot-state-sync
- @wiki/patterns/turn-based-ecs-orchestrator