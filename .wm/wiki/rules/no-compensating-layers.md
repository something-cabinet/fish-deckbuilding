---
title: No Compensating Layers — every abstraction earns its existence
type: rule
id: wiki:rules:no-compensating-layers
status: active
tags: [rule, architecture, yagni, refactor, anti-pattern]
relates_to:
  - {type: references, target: wiki:concepts:layers-of-stupidity-compensating-layers}
---

# No Compensating Layers — every abstraction earns its existence

## Rules

1. **Every abstraction has a consumer.** A queue that never holds more than one element is a function call. A registry with zero handlers is a delete. If `grep` can't find a caller, the abstraction is not architecture — it is debt. Delete it.
2. **Fix the root cause; never patch the patch.** When a workaround coexists with the bug it was supposed to fix, the workaround is the bug's next disguise. The StrictMode external-drain fix coexisted with impure updaters in undo/redo — one click popped two history entries.
3. **One source of truth per concern.** One id system, one resolver, one return signature. If two implementations must stay in sync by hand (card resolver vs trinket resolver, engine fx ids vs UI re-stamped ids), merge them.
4. **The compiler stays on.** Never set `typescript.ignoreBuildErrors` (or equivalent) — a build that skips type-checking turns the verification story into fiction.
5. **Red-baseline tests cover the bug class, not the happy path.** A StrictMode suite that tests move/cast/attack/sell/buy/endTurn but not undo is how the undo double-pop shipped. Write the failing test for the actual bug first.
6. **Tests assert semantics; dead branches get deleted.** Identical-branch conditionals and empty escape-hatch registries are the smell of a layer whose reason to exist was removed.

## Enforcement

- Code review greps: exported-but-unused symbols, single-element queues, empty registries/maps, `ignoreBuildErrors`, duplicate switches over the same union.
- Any new abstraction must state its consumer in the spec or be rejected.

## Related

- @wiki/concepts/layers-of-stupidity-compensating-layers (the failure this rule prevents)
- @wiki/specs/engine-reducer-rewrite (the rewrite that applied it)
- @wiki/patterns/pure-reducer-history-in-state (the replacement pattern)
