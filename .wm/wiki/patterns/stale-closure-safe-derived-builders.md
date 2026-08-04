---
{}
relates_to:
  - {type: extends, target: wiki:patterns:snapshot-diff-orchestration-seam}
---

---
{}
relates_to:
  - {type: references, target: wiki:tasks:battle--overworld-integration--rewards-boss-battles-zone-unlock-run-end}
---

---
title: Pattern: Stale-Closure-Safe Derived State Builders
type: pattern
id: wiki:patterns:stale-closure-safe-derived-builders
tags: [pattern, react, state, stale-closure, hooks, async]
---

# Pattern: Stale-Closure-Safe Derived State Builders

## Problem

In React, `setState`-based actions land **asynchronously** — the state object in the current render's closure is the OLD one. Code like this is buggy:

```ts
const handleNodeClick = (node) => {
  overworld.travel(node.id)        // schedules a state update (async)
  const battle = buildBattleState() // reads STALE state from the closure
  // -> buildBattleState() derives enemies from the OLD nodeId,
  //    so clicking a BOSS node starts a normal-battle lineup
}
```

The shape is generic: **"perform an action that mutates derived-consumer state, then immediately build something keyed to that action's input."** Any derived value that depends on the soon-to-change field will be wrong if read from the closure right after the action.

## Solution

Make the derived builder accept an **explicit override** for the field(s) the just-dispatched action changes, and let callers pass the action's input directly:

```ts
// hook exposes: buildBattleState(nodeIdOverride?: string)
const buildBattleState = useCallback((nodeIdOverride?: string) => {
  const s = state                                  // stale is fine — we override below
  if (!s) return null
  const eff = nodeIdOverride ? { ...s, nodeId: nodeIdOverride } : s
  return createInitialState({
    heroHp: eff.hp, heroMaxHp: eff.maxHp, deck: eff.deck,
    enemies: enemiesForNode(eff),                  // keyed to the clicked node
  })
}, [state])

// caller passes the action's input explicitly
overworld.travel(node.id)
enterBattle → buildBattleState(node.id)
```

**Rule of thumb:** when an action mutates state and the *next* action must read derived state keyed to that mutation's input, pass the input as an argument rather than reading the (soon-to-be-updated) state. This makes the dependency explicit and immune to closure staleness.

## When to Use

- Immediate follow-up actions after a `setState` transition (enter battle after travel, render panel after select).
- Any hook builder that derives config/enemies/validations from `state` fields that an async action just changed.
- Frameworks with async batched updates (React 18+ automatic batching makes this worse/more common).

## When Not to Use

- The consumer re-renders from the new state itself (no same-call-site derived read).
- The derived value only depends on fields NOT touched by the prior action.

## Related

- @wiki/tasks/battle--overworld-integration--rewards-boss-battles-zone-unlock-run-end
- @wiki/memory/snapshot-derived-value-before-mutating-its-dependency — same family (snapshot before mutation) in Svelte runes; this is the React closure variant
- @wiki/patterns/snapshot-diff-orchestration-seam — sibling: capture `prev` before reassigning