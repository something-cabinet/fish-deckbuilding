---
{}
relates_to:
  - {type: references, target: wiki:tasks:hook-strictmode-render-test--red-green-validated-against-the-command-drain-fix}
---

---
title: Failure: React StrictMode double-invoke breaks impure setState updaters
type: concept
id: wiki:concepts:strictmode-double-invoke-impure-updater
status: draft
tags: [failure, react, strictmode, state-management, debugging]
---

## What went wrong

Every command action (move, cast, attack, sell, buy) silently no-opped in the browser: units wouldn't move, mana/cards/HP wouldn't change — yet the app rendered fine, END TURN advanced, and 57 engine tests + Node module-level repros all passed. The failure was invisible to every non-browser check.

## Root cause

React 19 dev StrictMode double-invokes setState updater functions (Next.js default). `useFishMafia` passed `setState(drain)` where `drain` consumed the `GameSession` command queue as a side effect:

1. First (discarded) invocation drained the command and returned a new state
2. Second invocation found an empty queue and returned the unchanged state
3. React committed the second result → bailed out (same reference) → no re-render

END TURN only *appeared* to work because its enemy steps + `beginPlayerTurn` ran through separate pure updaters that advanced the turn regardless.

## Prevention

- **Never mutate an external queue/session inside a setState updater.** Updaters must be pure — StrictMode double-invokes them in dev.
- Drain synchronously OUTSIDE setState using a ref to the latest committed state, then `setState(ns)` with a concrete value.
- **Browser-only failures need browser verification.** Node/tsx/vitest all passed while the browser broke — test render paths under `<StrictMode>` (see the regression spec), and drive real browser interaction to confirm.
- When "everything command-based is dead but rendering works", suspect impure updaters + StrictMode double-invoke before deep engine debugging.

## Time lost

~1 hour: chased barrel/circular-import theories and ran A/B pre/post-refactor comparisons before instrumenting the hook's drain path with console probes, which showed the two drain invocations (new ref then same ref).

## Related

- @wiki/memory/react-strictmode-double-invoke-breaks-impure-setstate-updaters-command-drain
- @wiki/specs/strictmode-command-regression-tests
- @wiki/tasks/hook-strictmode-render-test--red-green-validated-against-the-command-drain-fix