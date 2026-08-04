---
{}
relates_to:
  - {type: relates_to, target: wiki:tasks:write-card-behavior-parity-tests-against-current-engine-red-baseline}
---

---
title: Pattern: Behavior-Capture Parity Oracle Before Refactor
type: pattern
id: wiki:patterns:behavior-capture-parity-oracle
tags: [pattern, testing, refactor, tdd, parity]
---

# Pattern: Behavior-Capture Parity Oracle Before Refactor

## Problem

A pure refactor (behavior must stay byte-identical — same numbers, same fx events, same log text, same validation rejects) has no safety net: you rewrite the implementation and cannot tell whether behavior drifted. TDD's red-green-refactor is for NEW behavior; a refactor has no failing test to write first. Without an oracle, refactor correctness is eyeballed and the project's historical P0 class (untested orchestration drift, see @wiki/core/critical-patterns) returns.

## Solution

Before touching the implementation, write **behavior-capture tests that assert the CURRENT behavior of the existing code** — tests that pass against today's implementation (green baseline, not red). These become the parity oracle: the refactor is complete when it keeps the oracle green with zero test edits.

Applied in the card-effect-registry refactor (2026-08-03): wrote 13 tests capturing the `castCard` switch's exact per-card outcomes (damage amounts, heals, draw counts, coin gains, summon stats, fx kind/order, log text, validation rejects) against the OLD switch. Then implemented the resolver + rewired `castCard`; the suite stayed 39/39 → 50/50 → 57/57 green, proving byte-identical behavior. Any drift in fx order (e.g. card fx before dealDamage shock), log copy, or death-cleanup would have failed the oracle immediately.

Key discipline: the oracle is written against the CURRENT code, so it must pass before the refactor starts. Snapshot values into locals BEFORE mutation (`hpBefore`, `buffBefore`) — reading `target.hp` after mutation reads the already-changed object. Target survivor units for damage tests (a 4 HP Thug dies to foreclose's 6 damage, removing it via cleanupDead and adding a death fx).

## When to Use

- Pure refactors with a behavior-parity requirement (D4-style: "identical behavior, no balance changes")
- Rewriting a switch/dispatcher into a data-driven or pattern-based form
- Any change where the acceptance criterion is "same observable behavior"

## When Not to Use

- New features (use red-green-refactor instead)
- Behavior-changing work — the oracle would lock in behavior you intend to change
- Cosmetic/formatting changes where exact output is not the contract

## Related

- @wiki/rules/tdd (red-green-refactor — the new-behavior counterpart)
- @wiki/specs/card-effect-registry (D4 parity requirement this pattern serves)
- @wiki/tasks/write-card-behavior-parity-tests-against-current-engine-red-baseline