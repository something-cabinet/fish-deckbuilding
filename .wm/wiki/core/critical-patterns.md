---
title: Critical Patterns
type: core
tags: [critical]
---

---
title: Critical Patterns
type: core
tags: [critical]
---

# Critical Patterns

Promoted learnings from completed work. Read this at the start of every session via `wm-init`. These are lessons that cost the most to learn and save the most by knowing.

---

## 2026-07-27 — Test the UI Orchestration Layer, Not Just Pure Functions

**Category:** failure
**Source:** @task-tasks:rewrite-combat-into-excalibur-ecs-with-events
**Tags:** [testing, ui, orchestration]

All 7 P0 bugs across 3 Oracle reviews lived in BattleHUD.svelte — the untested UI wiring layer. The pure function layer had 0 bugs across 79 tests. Root cause: no integration tests for the orchestration code that connects game logic to UI.

**What to do differently:** Write integration tests that script a full battle cycle (draw → play → defend → victory/death). Test the orchestration, not just the leaf functions. UI components should be thin — call tested controllers.

**Full entry:** @wiki/concepts/untested-ui-orchestration-p0s

---

## 2026-07-27 — Always Split Roguelite State into Run + Combat

**Category:** pattern
**Source:** @task-tasks:rewrite-combat-into-excalibur-ecs-with-events
**Tags:** [state, architecture, roguelite]

RunState persists across battles (deck, HP, gold, relics). CombatState is per-battle (hand, draw pile, turn phase). Copy the run deck into a battle deck at combat start — never modify the run deck during combat. Discard battle deck on exit.

**What to do differently:** Enforce this split from day 1. The initial flat GameState caused deck corruption. The split fixed it.

**Full entry:** @wiki/patterns/run-combat-state-split

---

## 2026-07-27 — Snapshot-Based State Sync Prevents ECS Desyncs

**Category:** pattern
**Source:** @task-tasks:rewrite-combat-into-excalibur-ecs-with-events
**Tags:** [ecs, state, sync, event-driven]

In event-driven ECS architectures, per-field granular events (card:played → sync coins, enemy:hurt → sync HP) inevitably produce desyncs — 5 P0 bugs in this project were caused by this pattern. Switching to a single `state:changed` snapshot event after every action eliminated all of them.

**What to do differently:** Emit a full state snapshot after every action, not per-field events. The bridge/subscriber does a bulk sync from the snapshot. Keep granular events only for transient UI effects (flashes, animations).

**Full entry:** @wiki/patterns/snapshot-state-sync
