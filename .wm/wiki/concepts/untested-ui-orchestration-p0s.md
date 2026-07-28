---
---

## What went wrong
Across the project's history, **ALL P0 bugs have been in the untested UI orchestration layer** — never in the pure function game logic. This pattern repeated twice across two architectures (roguelite deckbuilder and tactical RPG).

### First occurrence (July 2026 — Original roguelite)
All 7 P0 bugs across 3 Oracle reviews lived in BattleHUD.svelte — the untested UI wiring layer. The pure function layer (CombatController, CoinSystem, TurnFlow) had 0 bugs across 79 tests.

Specific bugs that could have been caught by testing:
1. Deck corruption — drawing from run.deck instead of a battle copy
2. Defense broken — hand dumped before defense prompt
3. Victory unreachable — no check after play card damage
4. Attacks hitting empty slots — no occupied-only filter
5. Duplicate card ID removal — filter removed all copies not one

### Second occurrence (July 2026 — Tactical RPG pivot)
During the pivot to Duelyst-style grid combat, the SAME failure pattern repeated. The combat engine and grid were thoroughly tested (194 tests), but the orchestrator → bridge → UI path had zero integration tests. The 457-line CombatOrchestrator.test.ts was deleted during cleanup without replacement. This caused 3 P0s at final validation:

1. Attack/Summon cards no-op in UI — no target position supplied
2. Base attack, movement, and replace unreachable (no buttons wired)
3. No grid rendered in battle — old deckbuilder enemy-row layout shown

## Root cause
In both cases, the pure function layer was well-tested (79 tests → 194 tests). The UI wiring code that connects pure functions to interactive interfaces had zero coverage. The orchestrator is the critical integration seam, and each time it was left untested.

The project's own NFR-2 ("untested UI layer caused all P0s") was written after the first occurrence specifically to prevent this — but the orchestrator test suite was deleted during cleanup and not rebuilt.

## Resolution
1. Rewrote CombatOrchestrator as a proper bridge with 12 integration tests
2. Added FullBattleCycle.test.ts (18 integration tests) for end-to-end combat scenarios
3. Every orchestrator function (moveUnit, baseAttack, playCard, replaceCard, endPlayerTurn) is now tested

## Prevention
- **Never delete orchestrator-level tests without replacement** — they are the regression net for the UI integration seam
- Integration tests must cover: move → attack → play card → replace → end turn → victory → defeat
- Oracle reviews must specifically verify the bridge → UI path, not just pure function logic
- UI components should be thin — call tested orchestrator functions, don't implement game logic
- Use snapshot-based state sync to prevent per-field desyncs

## Time lost
~40-60 hours of debugging, Oracle reviews, and remediation passes (first occurrence).
~8-12 hours of remediating the same pattern (second occurrence).

## Related
- @task-tasks:rewrite-combat-into-excalibur-ecs-with-events
- @wiki/patterns/snapshot-state-sync
- @wiki/patterns/turn-based-ecs-orchestrator