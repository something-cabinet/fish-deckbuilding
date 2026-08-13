---
title: Pure Reducer with In-State History (StrictMode-safe by construction)
type: pattern
id: wiki:patterns:pure-reducer-history-in-state
status: reviewed
tags: [pattern, react, state-management, reducer, undo, strictmode]
relates_to:
  - {type: implements, target: wiki:specs:engine-reducer-rewrite}
---

## Problem

React 19 dev StrictMode double-invokes setState updaters. Any updater that consumes external mutable state (a command queue, a session object's stacks) is broken by construction: the discarded invocation consumes it, the second finds it gone. The workaround — draining outside the updater via refs — only patches the paths you remember; undo/redo slipped through and double-popped.

## Solution

Make every state transition a pure function of its argument, and put everything the transition needs **inside the state**:

1. **Pure reducer**: `reduce(state, action) → { state, fx }` — total, exhaustive over a plain-data action union, no external reads/writes. Dispatches to pure per-action functions.
2. **History in state**: undo/redo history is part of the state bundle — `HistoryBundle { state, past, future }` — and `undoHistory(bundle)` / `redoHistory(bundle)` are pure functions. The discarded StrictMode invocation computes the identical result from the identical argument: correctness is structural, not discipline.
3. **Hook holds one bundle**: `useState<HistoryBundle & { fx }>`, every updater body is a pure function of the bundle. No refs mirroring state, no session objects, no drain/commit machinery.
4. **Async pacing lives outside the reducer**: animations/enemy turns run in the hook as a loop of pure reducer calls, one per animation step, committing each through the same pure updater.

## When to Use

- Interactive state that must survive React StrictMode (dev default in Next.js) with correct undo/redo
- Deterministic replay/testing: same `(state, action)` sequence → identical result, directly testable
- Any engine where "gestures dispatch, pipeline emits state + fx" is the contract

## When Not to Use

- State that is trivially local to one component (useState/useReducer overkill)
- Real command/event-sourcing needs: actual replay, network sync, or multi-command batching — a queue is then justified, but it must still be *inside* the state, never a mutable class the updater touches
- If you need history across navigation boundaries, consider lifting the bundle to a store — the pattern itself is framework-agnostic

## Related

- @wiki/specs/engine-reducer-rewrite (the rewrite this pattern came from)
- @wiki/decisions/engine-reducer-rewrite (ADR)
- @wiki/patterns/pure-setstate-updaters-external-drain (superseded workaround)
- @wiki/concepts/strictmode-double-invoke-impure-updater (failure this kills)
