---
{}
relates_to:
  - {type: references, target: wiki:tasks:overworld-engine--types-zone-data-seeded-map-generation-saveload}
---

---
title: Pattern: Seeded Deterministic Procedural Map Generation
type: pattern
id: wiki:patterns:seeded-deterministic-map-generation
tags: [pattern, procedural, rng, seeded, overworld, roguelite, react]
---

# Pattern: Seeded Deterministic Procedural Map Generation

## Problem

A roguelite needs procedural branching content (StS-style zone maps) that:
- Is **identical for a given run seed** across server render, client render, and every reload in between (NFR-1) — the player must not see the map reshuffle.
- **Differs per new run** (new seed → new map).
- Guarantees playable structure: every run's map must connect start → boss and have no dead-end rows, regardless of the randomness.

Using `Math.random()` directly (or module-scope RNG state) breaks determinism: SSR and the first client render disagree, and reloads mutate the map.

## Solution

Use a small seeded PRNG (mulberry32, ~15 lines) and derive EVERYTHING from it:

```ts
function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// one rng per zone, derived from run seed + zone index
const rng = mulberry32(runSeed * 7919 + zoneIndex * 104729)
```

Generation pipeline (all deterministic given the seed):
1. **Row counts** — from rng (e.g. 2-3 nodes per middle row).
2. **Node types** — weighted pick (battle/rest), boss forced on the last row.
3. **Edges / connectivity** — wire each node to 1-2 nodes in the next row near its column, then run a **guarantee pass**: every row r+1 node must have ≥1 incoming edge (connect nearest previous-row node if missing). This is what ensures start → boss is always reachable.
4. **Layout** — derive positions from `(row, col)` counts, NOT from rng ("row/cols → normalized 0..100"), so layout is stable and viewport-independent.

Reuse the same seed family for rewards/encounters (`seed * 31 + zoneIndex * 131 + hash(nodeId)`), so rewards also depend on the node reached.

Key property: **all randomness flows from the seed**. Never shuffle with `Math.random` in render-side map code.

## When to Use

- StS-style branching maps, dungeon/level generators, encounter or reward pools that must be stable per run seed.
- Any browser game that does SSR + client render and needs identical output (hydration safety).
- Deterministic test fixtures — seedable generation makes map tests reproducible (`same seed → same map`).

## When Not to Use

- Cosmetic, throwaway variety (particle positions, sparkle offsets) where reproducibility buys nothing.
- Server-authoritative content where the layout is baked at deploy time anyway.

## Related

- `src/lib/game/overworld-engine.ts` (`generateZoneMap`, `rollRewards`)
- @wiki/tasks/overworld-engine--types-zone-data-seeded-map-generation-saveload
- @wiki/decisions/browser-localstorage-persistence (companion: save stores only the seed + small state, so maps regenerate deterministically on load)