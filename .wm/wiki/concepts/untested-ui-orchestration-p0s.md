---
{}
relates_to:
  - {type: references, target: wiki:tasks:rewrite-combat-into-excalibur-ecs-with-events}
---

---
title: Failure: Untested UI Orchestration Layer Caused All P0 Bugs
type: concept
id: wiki:concepts:untested-ui-orchestration-p0s
tags: [failure, testing, ui, orchestration]
---

## What went wrong
Across 3 Oracle reviews, ALL 7 P0 bugs lived in BattleHUD.svelte — the untested UI orchestration layer. The pure function layer (CombatController, CoinSystem, GridCombat, TurnFlow) had 0 bugs.

## Root cause
BattleHUD.svelte handled: card play, targeting, end-turn flow, defense phase, victory/death checks, deck management — all with direct $state mutation and no tests. The pure function layer had 79 tests and was architecturally sound, but the wiring code that connected pure functions to UI had zero coverage.

Specific bugs that could have been caught by testing:
1. Deck corruption — drawing from run.deck instead of a battle copy
2. Defense broken — hand dumped before defense prompt
3. Victory unreachable — no check after play card damage
4. Attacks hitting empty slots — no occupied-only filter
5. Duplicate card ID removal — filter removed all copies not one

## Prevention
- Test the orchestration layer, not just the pure functions
- Consider extracting orchestration into a testable controller (CombatController pattern)
- Integration tests that script a full battle cycle (play → defend → victory/death)
- UI components should be thin — call tested controllers, don't implement game logic

## Time lost
~40-60 hours of debugging, Oracle reviews, and remediation passes that could have been avoided with integration tests for the orchestration layer.

## Related
- @task-tasks:rewrite-combat-into-excalibur-ecs-with-events