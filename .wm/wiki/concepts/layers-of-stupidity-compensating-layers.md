---
title: 'Failure: Layers of stupidity — compensating architecture layers'
type: concept
id: wiki:concepts:layers-of-stupidity-compensating-layers
status: reviewed
tags: [failure, architecture, refactor, yagni, anti-pattern]
relates_to:
  - {type: references, target: wiki:concepts:strictmode-double-invoke-impure-updater}
---

## What went wrong

An external review of the engine (paraphrased: "layers of stupidity stacked, each compensating the other") correctly identified that the codebase was a command queue with a game attached — every abstraction existed to justify the abstraction before it, and each layer patched the layer above's failure instead of fixing the root cause. The rewrite (2026-08-13, @wiki/specs/engine-reducer-rewrite) removed the whole stack.

The concrete instances, all in one engine:

| Symptom | Root cause | The compensating layer |
|---|---|---|
| CommandQueue never held >1 command (enqueue + drain synchronously per action) | A "deterministic replay" (StS2 GameActionQueue) requirement that no code path actually needed | The queue itself — theater to satisfy a spec bullet |
| Undo **double-popped** under dev StrictMode (one click = two steps back, corrupted redo) | `undo`/`redo` mutated the session's stacks inside `setState` updaters — the exact impurity the file's own comment claimed was forbidden | `stateRef`/`commit()`/`drain()` machinery built to fix the *other* impure updater (actions), while the undo path kept the bug |
| Trinket fx events silently dropped at 4 call sites (sellCard, cleanupDead, startGame, beginPlayerTurn) | `sellCard` returned bare `GameState`; trigger fx arrays died on the floor | `executeCommand` fabricated `fx: []` for sell — completing the drop with a special case |
| FX events carried duplicate `id: state.logCounter` values | fx ids shared a counter that only `log()` incremented | UI threw engine ids away and re-stamped with its own `fxSeed` — two id systems, one garbage |
| Two effect resolvers (cards: 7 kinds; trinkets: reduced 4-kind copy) + a custom-effect registry with **zero** production handlers | Bolted-on trigger system duplicating card effects | Registry as documented "escape hatch" — YAGNI shipped as architecture |
| `beginPlayerTurn` if/else with identical branches | Dead refactor | Nobody noticed — tests assert outcomes, not sense |
| Build compiled with type errors | `typescript.ignoreBuildErrors: true` | The entire "tsc --noEmit 0 errors" verification story was optional at build time |

## Root cause

Spec-driven development generated requirements to justify architecture (AC-12 "deterministic queue", FR-14 custom registry), and the architecture then generated compensating layers when it collided with reality (StrictMode, dropped data, duplicate ids). Each patch was locally reasonable; the stack as a whole was not. The failure mode is additive: no single layer is obviously wrong, so no single review catches it.

## Prevention

- **Every abstraction must have a consumer.** If a queue never holds more than one element, it is a function call. If a registry has zero handlers, it is a delete.
- **Fix the root cause; never patch the patch.** When a workaround (external-drain) coexists with the bug it was supposed to fix (impure updaters in undo/redo), the workaround is the bug's next disguise.
- **One source of truth per concern.** One id system, one resolver, one return signature. If two things must stay in sync by hand, merge them.
- **The compiler stays on.** `ignoreBuildErrors` turns a verification story into a fiction.
- **Red-baseline tests must cover the bug class, not the happy path.** The StrictMode suite tested move/cast/attack/sell/buy/endTurn — and missed undo, where the bug lived.
- **Tests assert semantics, and dead branches get deleted** — identical-branch conditionals and empty registries are the smell of a layer whose reason to exist was removed.

## Time lost

~1 session rewrite of the command/session machinery (deepwork pipeline, 2 Oracle gates) to remove layers that never needed to exist. The critique was correct the first time.

## Related

- @wiki/specs/engine-reducer-rewrite
- @wiki/decisions/engine-reducer-rewrite
- @wiki/patterns/pure-reducer-history-in-state
- @wiki/rules/no-compensating-layers