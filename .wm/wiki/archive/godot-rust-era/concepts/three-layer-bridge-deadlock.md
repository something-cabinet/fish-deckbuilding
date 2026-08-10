---
{}
relates_to:
  - {type: references, target: wiki:specs:godot-battle-scaffold}
---

---
title: Failure: Three-Layer Bridge-Engine Deadlock
type: concept
id: wiki:concepts:three-layer-bridge-deadlock
tags: [failure, bridge, orchestration, testing]
---

---
title: Failure: Three-Layer Bridge-Engine Deadlock
type: concept
tags: [failure, bridge, orchestration, testing]
---

## What went wrong
The attack action was impossible through the UI despite working perfectly in core Rust tests.

## Root cause
Three mutually exclusive conditions, each in a different layer, none tested together:

1. **Bridge selection** (`try_select_unit`): only selects units where `moves_made == 0`
2. **Engine attack** (`player_attack`): rejects if `moves_made == 0` (old strict rule)
3. **Bridge move** (`try_move_selected`): clears selection after moving (`selected = None`)

The only possible flow: select unit → move → selection cleared → try to attack → no selection → dead end. Or: select unit → try to attack → engine rejects (must move first) → error swallowed by `.ok()` → zero feedback.

Each layer was correct in isolation. Every path was dead in composition.

## Prevention
- Bridge-level integration tests must script the full select → move → attack cycle (not just unit tests for each function)
- `valid_targets()` single-source-of-truth pattern prevents this category of drift
- Never swallow errors with `.ok()` in orchestration code — always log failures
- Bridge selection should check "can unit act?" (`!exhausted()`), not "is unit unmoved?"

## Time lost
~2 hours to diagnose + fix across 6 Oracle review gates (it took the review to find it — no automated test caught it)

## Related
- @wiki/core:critical-patterns (2026-07-27 — Test the UI Orchestration Layer)
- Fixed in: `rust/src/bridge/battle_scene.rs`