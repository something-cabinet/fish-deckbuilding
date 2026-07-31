---
{}
relates_to:
  - {type: extends, target: wiki:core:critical-patterns}
---

---
title: Pattern: Snapshot-Diff Orchestration Seam
type: pattern
id: wiki:patterns:snapshot-diff-orchestration-seam
tags: [pattern, snapshot, orchestration, renderer, testing]
---

# Pattern: Snapshot-Diff Orchestration Seam

## Problem

Two render layers (a DOM UI framework and a canvas engine) must stay in sync with a pure game core, and the "damage visuals" must trigger from authoritative state changes — but the core intentionally emits NO per-card damage events (only movement/sell/card-played flourishes). Without a tested seam, renderers either duplicate engine logic or miss state transitions entirely (the repo's signature P0 pattern: untested UI/bridge wiring).

## Solution

Put a **pure, unit-tested diff function between the snapshot stream and the renderers**:

```ts
// pure function — the ONLY tested path from engine snapshots to needle targets
export function damageOccurrences(prev: GameSnapshot | null, next: GameSnapshot): DamageOccurrence[] {
  if (prev === null) return [];
  return next.units
    .map((u) => ({ uid: u.uid, prev: prev.units.find((p) => p.uid === u.uid) }))
    .filter((x) => x.prev && x.prev.hp > x.prev.hp)
    .map((x) => ({ uid: x.uid, damage: x.prev!.hp - x.prev!.hp }));
}
```

Renderers receive the full snapshot (single-input discipline); the diff (e.g., `diffSnapshots`, `damageOccurrences`) computes needle targets, spawns, removals, and coin deltas. Events remain transient flourishes only.

Critical detail from the failure that created this seam: **capture `prev` BEFORE reassigning `lastSnap`** — the bug class is diffing against the NEW snapshot, which silently kills every damage burst.

## When to Use

- Engine emits full snapshots, renderers need per-unit deltas (HP loss, coin change, unit spawn/removal).
- Two render layers share one snapshot stream and must not re-derive rules.
- Any "no event for X" case — drive visuals from snapshot diff, never from un-emitted events.

## When Not to Use

Single-layer apps where the framework reacts directly to state; or when the engine already emits granular authoritative events for every transition.

## Related

- @wiki/specs/js-combat-vertical-slice (Gate 2 P2 directive: damage visuals from snapshot diff only)
- @wiki/core/critical-patterns — snapshot-based state sync + test-the-orchestration entries
- @wiki/memory/snapshot-based-state-sync