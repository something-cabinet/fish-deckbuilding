---
title: Decision: Pure-Function Affix Operations with Seeded Deterministic RNG
type: decision
tags: [decision, affix, rng, testing, crafting]
status: approved
---

## Context
The affix/crafting system needed operations that modify card affixes (reroll, add slot, corrupt). These operations needed to be testable, reproducible across runs, and composable with the existing overworld/run state.

## Decision
All crafting operations are pure functions that take a `CardDef` and return a new `CardDef`, never mutating the original. Randomness is provided by a simple LCG (`SeededRng`) that is seeded per-operation.

```typescript
function enchanterReroll(card: CardDef, affixIdx: number, seed: number): CardDef;
function gamblerAddSlot(card: CardDef, seed: number): CardDef;
function corrupt(card: CardDef, seed: number): [CardDef, CorruptOutcome];
```

The overworld `RunState` wraps these with gold-cost checks and deck mutation:
```typescript
enchanterReroll(deckIdx: number, affixIdx: number, seed: number): CardDef | null;
```

## Rationale
- **Testability**: Pure functions need no mocking, no state setup beyond the card itself. All 14 tests pass without any global state.
- **Determinism**: Same seed + same card = same result. This satisfies NFR-1 (roguelike fairness) and AC-9.
- **Separation of concerns**: The pure functions handle affix logic; the `RunState` wrapper handles economy (gold, deck management). Neither needs to know about the other's internals.
- **Composability**: The corrupt operation returns the outcome enum, allowing the caller to decide what to do with the result (e.g., display a different log message per outcome).

## Consequences
- Seeds must be passed through the call chain, which adds a parameter to crafting functions
- The LCG is simple enough for game purposes but not cryptographically secure (not a concern for single-player games)
- The pure function approach means small allocations (clone + modify) per operation, but affix operations are infrequent so this is not a performance concern
- The `RunState` methods return `CardDef | null` (nullable), limiting how the result can be used before the reference is released

## Related
- @wiki/specs/combat-affix-crafting-system
- @wiki/patterns/affix-based-effect-composition