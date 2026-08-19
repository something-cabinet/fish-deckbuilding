---
title: Engine Reducer Rewrite — replace command/session machinery with pure reducer
type: decision
id: wiki:decisions:engine-reducer-rewrite
status: approved
tags: [decision, engine, reducer, undo, strictmode, architecture]
relates_to:
  - {type: relates_to, target: wiki:specs:engine-reducer-rewrite}
---

## Context

The engine previously wrapped pure action functions (`moveUnit`, `castCard`, `sellCard`, `unitAttack`) in a stack of machinery — `CommandQueue`, a mutable `GameSession` (memento undo/redo), a hook-side `stateRef`/`commit()`/`drain()` dance to survive React StrictMode, and a duplicate trinket effect resolver — whose layers compensated for each other's failures:

- The command queue never held more than one command (every action enqueued then drained synchronously); the "deterministic replay" (StS2 GameActionQueue parity) claim it justified was fiction.
- Undo/redo mutated the session inside `setState` updaters, so React 19 dev StrictMode double-invoked the updater and popped **two** history entries per undo click (double-pop bug), duplicating redo entries.
- `sellCard` returned `GameState` instead of `{state, fx}` and dropped trinket `onCardSold` fx; `cleanupDead`, `startGame`, and `beginPlayerTurn` also discarded trigger fx at their call sites.
- FX events carried duplicate `id: state.logCounter` values, which the UI threw away and re-stamped with its own counter.
- Two effect resolvers existed (cards: 7 kinds; trinkets: a reduced 4-kind copy) plus a custom-effect registry with zero production handlers.

## Decision

Replace the command/session machinery with a single pure reducer: `reduce(state, action) → {state, fx}`. Undo/redo history (`past[]`/`future[]`) lives in state as a `HistoryBundle`; the hook holds `{state, past, future, fx}` in one `useState` with pure updaters only; `GameState` gains an `fxCounter` for engine-issued unique fx ids; trinket triggers route through the shared `resolveCardEffects` resolver. The `CommandQueue`, `GameSession`, custom-effect registry, and custom `CardEffect` kind are deleted; the `commands/` and `session/` directories are removed; `sellCard` returns `{state, fx}`.

## Options Considered

1. **Status quo (keep queue)** — keep `CommandQueue` + `GameSession` as-is. Rejected: the queue never held more than one command, the deterministic-replay claim it justified was false, and the layers added indirection without payoff.
2. **Minimal bug fixes** — patch the StrictMode double-pop, dropped trinket fx, and duplicate fx ids in place. Rejected: StrictMode correctness would remain a workaround layered on a mutable session instead of being structural; the duplicate resolver and dead registry would persist.
3. **Full reducer rewrite (chosen)** — pure `(state, action) → {state, fx}` with history in state. StrictMode correctness becomes structural (pure updaters only); one resolver; engine-issued unique fx ids; dead machinery deleted.

## Rationale

- **StrictMode correctness by construction** — pure updaters only means double-invocation is harmless; no ref/session dance.
- **History in state** — `undo(s)`/`redo(s)` are pure functions of state, directly testable; no mutable session object.
- **One resolver** — trinket and card effects share one exhaustive match; no duplicated, drifting logic.
- **Engine-issued fx ids** — no UI re-stamping; unique React keys without a separate counter.
- **Deleting the queue removes a fiction** — the deterministic-replay seam it justified was never real; reducer purity makes determinism a directly testable property.
- **Dead code removed** — custom-effect registry (zero handlers) and custom `CardEffect` kind deleted.

## Outcome

Reducer rewrite accepted and implemented: `reduce` in `src/lib/game/actions/reducer.service.ts`; `HistoryBundle` + `historyReducer`/`undoHistory`/`redoHistory` in `src/lib/game/actions/history.service.ts`; hook holds `{state, past, future, fx}` in one `useState`; `fxCounter` in `GameState`; trinkets resolve through `resolveCardEffects`; `sellCard` returns `{state, fx}`; `commands/` and `session/` directories deleted; custom registry + custom `CardEffect` kind removed. 275 tests green, build green. Docs updated in-spec (D7). See @wiki/specs/engine-reducer-rewrite.