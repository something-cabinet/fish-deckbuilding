---
{}
relates_to:
  - {type: relates_to, target: wiki:patterns:affix-based-effect-composition}
---

---
{}
relates_to:
  - {type: references, target: wiki:tasks:crafting-ui-actions}
---

---
---

## What went wrong
Across the project's history, **ALL P0 bugs have been in the untested UI orchestration layer** — never in the pure function game logic. This pattern repeated three times across two architectures (roguelite deckbuilder, tactical RPG, and the godot-rust bridge layer).

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

### Third occurrence (2026-07-31 — Card crafting affixes never applied in battle)
`apply_affixes_to_effects()` in `core/cards/affix.rs` was a fully-tested pure function (unit tests confirmed it correctly composes affix bonuses into effective `Damage`/`Heal`/`Shield`/`DrawCards` values) — but it was marked `#[allow(dead_code)]` because **nothing in the bridge layer ever called it**. `battle_scene.rs` played cards using raw `card.effects.clone()` in both the targeted-play and self-target-play paths, silently discarding every affix bonus. The crafting system (Enchanter add-slot, Gambler reroll, Corrupt) worked end-to-end — gold was spent, the card's `affixes` vec was correctly mutated, the UI showed the new affix text — but the crafted card hit exactly as hard as before in combat. This is more insidious than the first two occurrences: there was no crash, no visual glitch, and no failing test. The bug was only found by deliberately tracing "does this stat bonus reach the damage calculation," not by symptom.

`#[allow(dead_code)]` on a pure function is itself a signal worth treating as a checklist item: it means the function is not reachable from any production call site, which for anything meant to affect gameplay is a red flag, not a lint suppression to wave through.

## Root cause
In all three cases, the pure function layer was well-tested (79 tests → 194 tests → 160 tests). The UI/bridge wiring code that connects pure functions to interactive interfaces had zero coverage, and in the third case, zero *usage* — the function wasn't even called, let alone tested end-to-end from the bridge.

The project's own NFR-2 ("untested UI layer caused all P0s") was written after the first occurrence specifically to prevent this — but the orchestrator test suite was deleted during cleanup and not rebuilt (2nd occurrence), and no integration test exists that plays a crafted card in battle and asserts the boosted value applied (3rd occurrence).

## Resolution
1. Rewrote CombatOrchestrator as a proper bridge with 12 integration tests
2. Added FullBattleCycle.test.ts (18 integration tests) for end-to-end combat scenarios
3. Every orchestrator function (moveUnit, baseAttack, playCard, replaceCard, endPlayerTurn) is now tested
4. (3rd occurrence) Replaced `card.effects.clone()` with `affix::apply_affixes_to_effects(&card)` at both card-play call sites in `battle_scene.rs`, and removed the now-justified `#[allow(dead_code)]` from `apply_affixes_to_effects`

## Prevention
- **Never delete orchestrator-level tests without replacement** — they are the regression net for the UI integration seam
- Integration tests must cover: move → attack → play card → replace → end turn → victory → defeat
- Oracle reviews must specifically verify the bridge → UI path, not just pure function logic
- UI components should be thin — call tested orchestrator functions, don't implement game logic
- Use snapshot-based state sync to prevent per-field desyncs
- **When you see `#[allow(dead_code)]` on a `pub fn` in `core/`, grep for its call sites before assuming the feature it implements actually works.** A passing unit test suite for a function proves the function is correct in isolation — it proves nothing about whether the bridge/UI layer ever calls it.
- For any core function that computes a gameplay-affecting value (damage, cost, targeting), add at least one integration test that exercises it through the actual bridge entry point (the `#[func]` handler), not just the pure function directly.

## Time lost
~40-60 hours of debugging, Oracle reviews, and remediation passes (first occurrence).
~8-12 hours of remediating the same pattern (second occurrence).
~1-2 hours of code tracing to find the disconnect (third occurrence — caught proactively via user report of "does the upgrade actually do anything," not via crash or test failure).

## Related
- @task-tasks:rewrite-combat-into-excalibur-ecs-with-events
- @wiki/patterns/snapshot-state-sync
- @wiki/patterns/turn-based-ecs-orchestrator
- @wiki/patterns/affix-based-effect-composition
- @wiki/tasks/crafting-ui-actions