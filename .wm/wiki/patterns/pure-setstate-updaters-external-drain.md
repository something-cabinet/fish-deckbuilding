---
{}
relates_to:
  - {type: references, target: wiki:tasks:hook-strictmode-render-test--red-green-validated-against-the-command-drain-fix}
---

---
title: Pattern: Pure setState updaters — drain external queues via stateRef + commit
type: pattern
id: wiki:patterns:pure-setstate-updaters-external-drain
status: draft
tags: [pattern, react, strictmode, state-management]
---

## Problem

React 19 dev StrictMode double-invokes setState updater functions. A hook that mutates an external queue/session inside an updater (e.g. `setState((s) => drainQueue(s))` where `drainQueue` consumes a command queue as a side effect) silently breaks: the first invocation consumes the side effect and is discarded, the second sees an empty queue and returns the unchanged state, so React bails out and the UI never updates. Every action routed through the updater no-ops with zero errors.

## Solution

Keep setState updaters pure. Drain external mutable state synchronously OUTSIDE setState, using a ref that always holds the latest committed state, then commit the concrete result:

```ts
const stateRef = useRef<GameState>(state)
stateRef.current = state // keep in sync each render

const drain = useCallback(
  (s: GameState): GameState => {
    const { results, state: ns } = sessionRef.current.drain(s)
    for (const r of results) pushFx(r.fx)
    return ns
  },
  [pushFx],
)

const commit = useCallback(() => {
  const ns = drain(stateRef.current) // side effect happens here, once
  stateRef.current = ns
  setState(ns) // concrete value — StrictMode-safe
}, [drain])

const move = useCallback((unitId, dest) => {
  sessionRef.current.enqueue({ kind: "move", unitId, dest })
  commit()
}, [commit])
```

Rules:
- `stateRef.current` is assigned during render (kept in sync), so `commit()` always drains against the latest committed state.
- `setState(ns)` takes a concrete value, never a function that mutates external state.
- Async multi-step flows (e.g. enemy turn) apply each step against `stateRef.current`, update the ref, then `setState(ns)`.

## When to Use

- Any React hook wrapping a queue/session/command pipeline that must execute side effects in response to user actions (command pattern, undo/redo history, event bus).
- Next.js apps (StrictMode on by default in dev) with a reducer/service layer that consumes state.
- When adding new actions to a hook that already uses the commit/ref pattern — route the new action through `commit()`, not `setState(drain)`.

## When Not to Use

- Pure functional `setState(prev => ...)` updates with no external side effects — those are already StrictMode-safe.
- Production-only apps where StrictMode is disabled (the bug is dev-only), though keeping updaters pure is still best practice.

## Related

- @wiki/concepts/strictmode-double-invoke-impure-updater
- @wiki/tasks/hook-strictmode-render-test--red-green-validated-against-the-command-drain-fix
- @wiki/specs/strictmode-command-regression-tests