---
{}
relates_to:
  - {type: references, target: wiki:tasks:hook-strictmode-render-test--red-green-validated-against-the-command-drain-fix}
---

## What went wrong

Two manifestations of the same root cause, both silent in Node but broken in the browser:

**M1 (2026-08-03): actions no-op.** Every command action (move, cast, attack, sell, buy) silently no-opped in the browser: units wouldn't move, mana/cards/HP wouldn't change — yet the app rendered fine, END TURN advanced, and 57 engine tests + Node module-level repros all passed. The failure was invisible to every non-browser check.

**M2 (2026-08-13): undo double-pops.** The *workaround* for M1 kept the mutable `GameSession` class and moved draining outside the updater — but `undo`/`redo` still called `setState((s) => { const prev = sessionRef.current.undo(s); ... })`, mutating the session's past/future stacks inside the updater. Under dev StrictMode each undo click popped **two** history entries and duplicated redo entries. The dedicated StrictMode test suite covered move/cast/attack/sell/buy/endTurn but never undo — so the second instance shipped green tests with a broken browser behavior, exactly like M1.

## Root cause

React 19 dev StrictMode double-invokes setState updater functions (Next.js default). Any updater that consumes or mutates external state (a command queue, a session object's stacks) is unsafe:

1. First (discarded) invocation drains/pops the external state
2. Second invocation finds it already consumed → wrong result or bail-out
3. React commits one result, but the external state was mutated twice

## Prevention

- **Updaters must be pure functions of their argument — by construction, not by discipline.** If undo/redo needs history, put `past`/`future` **in the state** (a `HistoryBundle`), so `undo(bundle)` is a pure function and the discarded StrictMode invocation computes the identical result from the identical argument. This eliminates the entire bug class; the external-drain workaround (`@wiki/patterns/pure-setstate-updaters-external-drain`) is superseded by it.
- Never mutate a queue/session/ref inside a setState updater — including the undo/redo paths, which are easy to forget after fixing the action paths.
- **Every updater-consuming behavior gets a StrictMode render test** — especially undo/redo, the pair the original suite missed. Red-baseline tests written *before* the fix (`src/hooks/undo.strictmode.spec.tsx`) pin exactly-one-step semantics.
- **Browser-only failures need browser verification.** Node/tsx/vitest all passed while the browser broke — test render paths under `<StrictMode>` and drive real interaction.
- When "everything command-based is dead but rendering works", suspect impure updaters + StrictMode double-invoke before deep engine debugging.

## Time lost

M1 ~1 hour (barrel/circular-import theories before instrumenting the drain path). M2 the rewrite of the command/session machinery (~1 session) — the fix is structural, so it cost a rewrite instead of a patch.

## Related

- @wiki/memory/react-strictmode-double-invoke-breaks-impure-setstate-updaters-command-drain
- @wiki/specs/strictmode-command-regression-tests
- @wiki/tasks/hook-strictmode-render-test--red-green-validated-against-the-command-drain-fix
- @wiki/specs/engine-reducer-rewrite
- @wiki/patterns/pure-reducer-history-in-state
