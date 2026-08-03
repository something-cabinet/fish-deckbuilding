---
title: Card Effect Registry — Data-Driven Effects with Resolver (Visitor)
type: spec
status: approved
tags: [spec, engine, cards, refactor, tdd, design-patterns, command-pattern, approved]
---

# Card Effect Registry & Command Pipeline — Data-Driven Effects, Command Base, Trusted JSON Source

## Overview

Refactor the per-card-id `switch (card.def.id)` inside `castCard` (`src/lib/game/engine.ts:328`) and generalize the action layer into a layered architecture:

1. **Trusted data source** — card defs move out of `data.ts` into per-pack JSON files validated by a zod schema at load; `data.ts` becomes a typed loader.
2. **Data-driven effects** — `CardDef` gains `effects: CardEffect[]`; a generic resolver applies effects by kind via an exhaustive match (Visitor seam identified in @wiki/reference/design-patterns-gof).
3. **Command pipeline (StS2 model)** — ALL player actions (move, attack, play card, sell, buy, end turn) flow through a generic command base with `execute()`/`undo()`, executed in an ordered queue, with snapshot-based history. Enemy-phase steps already are command-shaped (`EnemyStep`) and conform to the same base mechanically. Command is the execution *base only* — no per-action subclasses; driven by data. Modeled on Slay the Spire 2's `GameActionQueue` (@wiki/reference/sts2-architecture-command-pipeline).

Designed to scale to **5xx cards** (~500+; the effect vocabulary grows to a few dozen closed primitives, card count lives in data, and a custom-effect escape hatch covers the long-tail cards that need unique behavior). Pure refactor — the 9 built-in cards must behave byte-identically. Custom cards remain display-only (unchanged scope). Follows the project's effects-first card model (@wiki/patterns/effects-first-card-model), TDD convention (@wiki/rules/tdd), snapshot-sync (@wiki/patterns/snapshot-state-sync), and browser-localstorage decisions (@wiki/decisions/browser-localstorage-persistence).

## Locked Decisions

- D1: Card effects become **data** — `effects: CardEffect[]` on `CardDef`, resolved by a generic resolver. Effect logic moves out of `castCard`.
- D2: **TDD required.** No test harness exists in the JS app today — the spec includes adding vitest, and each behavior gets a red test before implementation.
- D3: **Built-in cards only.** The 9 cards are migrated. Custom cards stay display-only; the registry is ready for them but wiring them is out of scope.
- D4: **Pure refactor, identical behavior.** Same damage/heal/draw/coin/summon numbers, same `FxEvent[]` output, same log text, same target validation. No balance changes.
- D5: **Closed discriminated union + exhaustive match.** `CardEffect` is a union of effect kinds; the resolver is an exhaustive match (TypeScript exhaustiveness). Adding a new effect kind means editing the union + resolver — compiler-driven, type-safe.
- D6: **Card-level `fx` stays.** `CardDef.fx` continues to fire one visual burst per cast. Visual concerns do not move into the effect union.
- D7: **Command is the base execution layer only.** A generic command (execute/undo) wraps actions. There are **no per-action command classes** — commands are generic and driven entirely by action data/parameters (ref: gameprogrammingpatterns.com/command.html — reified method call as execution skeleton; undo/redo is the payoff for turn-based games).
- D8: **Trusted JSON source with zod schema.** Card defs live in per-pack JSON files, validated at load by a zod schema. The schema is a `discriminatedUnion` mirroring the TS `CardEffect` union, and validates **both** built-in packs and (future) custom-card content — one schema, two sources. The loader (`data.ts`) validates at load and fails loudly; malformed data never silently produces broken cards. Hand-authored TS card objects were considered and rejected (verbose/ugly at 5xx scale); JSON is the clean content representation. A real DB is out of scope client-side (see @wiki/decisions/browser-localstorage-persistence). Counterpoint context: StS2 chose code-over-data (577 cards, deep per-card behavior); this repo's data-driven path fits its authoring UI + content pipeline (see @wiki/reference/sts2-architecture-command-pipeline).
- D9: **Full command pipeline (StS2 `GameActionQueue` model).** All player actions — move, attack, play card, sell, buy, end turn — route through a generic command base + ordered execution queue. Enemy-phase steps (`EnemyStep`) conform to the same command shape. Payoffs: deterministic action order, uniform undo, replay/logging seam (see @wiki/reference/sts2-architecture-command-pipeline).
- D10: **Undo policy — player phase only.** The undo history holds player-phase actions (move/attack/play/sell/buy). **End Turn commits the turn**: history clears at the turn boundary and the enemy phase is NOT undoable (command-shaped for deterministic execution, but outside the undo stack).
- D11: **Custom-effect escape hatch for the long tail.** The resolver additionally supports `{ kind: "custom", handlerId: string }` dispatched to a registry of registered handler functions (Chain of Responsibility seam). The initial 9-card migration ships **zero** custom handlers (YAGNI — first long-tail card that needs unique behavior adds the first one). The architecture exists so 5xx-scale special cards don't force the vocabulary to grow unbounded or reintroduce a per-card switch.

## Requirements

### Functional Requirements

- FR-1: `CardDef` gains `effects: CardEffect[]`; the 9 cards are migrated from switch cases to effect lists expressing identical behavior.
- FR-2: A resolver applies each effect in order, mutating state and producing the same `FxEvent[]` and log entries the current switch produces.
- FR-3: `castCard` keeps its unchanged responsibilities — hand lookup, mana cost check, `cardTargets` validation, pay + move-to-discard, cleanupDead, checkEnd — and delegates effect application to the resolver. It contains **no** switch on `card.def.id`.
- FR-4: The resolver supports exactly the effect kinds implied by the current cards: damage, heal, drawCards, gainCoin, buffAtk (signed), summon — plus the D11 `custom` escape hatch. (Exhaustive match over this union.)
- FR-5: Multi-effect cards (kneecap = damage + buffAtk-1; loan_shark = damage + heal hero) are expressed as ordered effect lists preserving the current resolution order.
- FR-6: Target validation (`cardTargets`, `types.ts:279`) is unchanged and remains the single source of truth for valid targets.
- FR-7: Card content is loaded from per-pack JSON files through a typed loader validating against the zod schema; invalid card data fails loudly (load-time error), never silently.
- FR-8: A generic command base (`execute()`/`undo()`) wraps **every player action** — move, attack, play card, sell, buy, end turn. No per-action command classes; commands are parameterized by data.
- FR-9: An ordered command queue executes actions deterministically in sequence; the enemy phase (plan → apply steps) routes through the same command shape.
- FR-10: Snapshot-based undo/redo history: execute pushes a pre-action snapshot; undo restores it; a new action after undo discards the redo tail.
- FR-11: **End Turn commits.** Executing end turn clears the undo history (player-phase boundary). Enemy-phase actions are executed as commands but never enter the undo stack.
- FR-12: The hook/UI layer consumes the command queue — user gestures enqueue commands; the pipeline executes them in order and emits state + fx (unchanged external contract).
- FR-13: The zod schema mirrors the TS `CardEffect`/`CardDef` types via `z.infer` (single source of truth — schema derives from types, not duplicated); the same schema validates built-in packs and future custom-card content.
- FR-14: The `custom` effect dispatches to a registry of handlers keyed by `handlerId`; an unknown handlerId fails loudly at load (registry validation), never silently no-ops.

### Non-Functional Requirements

- NFR-1: TDD — a failing test must exist before each behavior's implementation (red → green → refactor). Engine behavior is covered by automated tests, not manual play.
- NFR-2: Behavior parity — all 9 cards resolve identically pre/post refactor (numbers, fx events, log text, validation rejects). Player actions (move/attack/sell/buy/end turn) behave identically.
- NFR-3: Engine stays pure and headless-testable — resolver, loader, command base, and queue have zero React/framework dependencies.
- NFR-4: `npm run build` (tsc + next build) stays green; no UI contract changes.
- NFR-5: Adding an effect kind not handled by the resolver fails type-check (exhaustiveness) — no silent fall-through.
- NFR-6: The JSON source is schema-validated at load; malformed data surfaces as an error (thrown), and the schema derives from TS types (z.infer) so type/schema drift is impossible.
- NFR-7: Card JSON files are versioned and diffable (reviewable content changes); per-pack split supports 5xx scale; tweaking a card's numbers does not require touching engine code.
- NFR-8: Command execution order is deterministic — identical enqueue sequences produce identical state transitions (replay/logging seam per StS2).

## Acceptance Criteria

- [ ] AC-1: vitest is configured and `npm test` runs the engine test suite.
- [ ] AC-2: Each of the 9 cards has a test asserting its exact effect outcome (damage amounts, heals, draw counts, coin gains, summon stats) — written red before the resolver, green after.
- [ ] AC-3: `castCard` contains no `switch (card.def.id)` (grep-verifiable).
- [ ] AC-4: Every card in the JSON packs declares an `effects` list matching its documented behavior in `PRODUCT.md`, and the loader produces the same `CARD_LIBRARY` the app consumes today.
- [ ] AC-5: Multi-effect cards resolve in the same order and produce the same combined outcome as today (kneecap: 2 dmg + -1 ATK; loan_shark: 4 dmg + heal 2).
- [ ] AC-6: Unplayable casts still return unchanged state (wrong target, insufficient mana, wrong phase) — regression tests cover this.
- [ ] AC-7: An unresolvable effect kind is a compile error (exhaustiveness test).
- [ ] AC-8: Loading malformed card JSON throws/errors at load (schema validation test); no silent fallback.
- [ ] AC-9: Every player action (move, attack, play card, sell, buy) has an execute→undo round-trip test restoring the exact pre-action state (snapshot equality).
- [ ] AC-10: Undo history semantics — undo once restores prior state; undo repeatedly walks back through the player phase; a new action after undo clears the redo stack.
- [ ] AC-11: **End Turn clears the history** — after end turn executes, undo is empty; enemy-phase steps never appear in the undo stack (grep/test-verifiable).
- [ ] AC-12: Deterministic queue test — the same enqueue sequence produces identical state after execution (command order enforced, not interleaved).
- [ ] AC-13: No per-action command classes exist (grep — command base is generic; only the JSON source/resolver reference card ids).
- [ ] AC-14: Custom-card flow unchanged — creator/library still function; custom cards remain display-only.
- [ ] AC-15: `npm run build` green.
- [ ] AC-16: Schema derives from types — a change to the `CardEffect` union fails type-check until the schema (z.infer) is regenerated/updated (drift test).
- [ ] AC-17: Custom-effect registry — a registered handler resolves; an unknown `handlerId` in a pack fails loudly at load; zero custom handlers ship in the initial migration.

## Scenarios

### Scenario 1: Happy path — Demand Letter
**Given** a player-phase state with mana ≥ 1, an enemy in range, Demand Letter in hand
**When** the player casts Demand Letter on that enemy
**Then** mana decreases by 1, the card moves to discard, the enemy loses 2 HP, one `letter` fx fires at the enemy, the Bulletin logs "Demand Letter hits {name} for 2.", and a dead enemy is cleaned up / end state re-checked.

### Scenario 2: Multi-effect — Loan Shark
**Given** player mana ≥ 3, an enemy target, hero below max HP
**When** the player casts Loan Shark on the enemy
**Then** the enemy takes 4 damage, the hero heals 2 HP (capped at maxHp), and fx/log reflect both effects in the current order.

### Scenario 3: Summon — Hired Muscle
**Given** an empty target tile
**When** the player casts Hired Muscle on that tile
**Then** a Goon unit (5 HP / 2 ATK / move 2, hasMoved+hasActed true) spawns on the tile, `summon` fx fires, and the log records the tile label.

### Scenario 4: Undo a card play
**Given** Demand Letter cast on an enemy (mana paid, card discarded, damage dealt)
**When** the player undoes
**Then** state equals the exact pre-play snapshot — mana refunded, card back in hand, enemy HP restored, no fx, no log residue.

### Scenario 5: Undo a move
**Given** a unit moved to a new tile this player phase
**When** the player undoes
**Then** the unit returns to its previous tile, `hasMoved` restored to false, state equals the pre-move snapshot.

### Scenario 6: Undo then act differently
**Given** an undo just restored a pre-action state
**When** the player performs a different action
**Then** the redo tail is discarded; the new action's undo restores the same pre-action state.

### Scenario 7: End Turn commits
**Given** several player actions this turn (moves, casts) and undo history populated
**When** the player ends the turn
**Then** the undo history is cleared; the enemy phase executes deterministically; no undo can reach back into the previous player phase.

### Scenario 8: Edge — invalid target rejected
**Given** Demand Letter in hand but the cast targets an ally (target type "enemy")
**When** the player casts
**Then** state is returned unchanged (no mana spent, no card discarded, no fx, no history entry), exactly as today.

### Scenario 9: Edge — insufficient mana
**Given** mana below the card's cost
**When** the player casts
**Then** state is unchanged, no fx, no log, no history entry.

### Scenario 10: Edge — draw effect with empty deck
**Given** Market Rate cast with an empty draw pile and cards in discard
**When** the effect resolves
**Then** the discard reshuffles into the deck, 2 cards are drawn (respecting hand size cap), and the "ledger is reshuffled" log fires — matching current behavior.

### Scenario 11: Trusted source — malformed card
**Given** a card JSON pack contains a card with an invalid effect kind or missing required field
**When** the app loads
**Then** a load-time error is raised (test asserts the failure); the app does not boot with silently broken cards.

### Scenario 12: Deterministic replay
**Given** a recorded enqueue sequence (moves, casts, sells, buy) executed against a fresh state
**When** the same sequence is replayed against another fresh state
**Then** the resulting states are identical (command-order determinism — the replay/logging seam).

### Scenario 13: Long-tail card (escape hatch)
**Given** a future card with behavior no effect primitive can express, shipped as `{ kind: "custom", handlerId: "xyz" }` with a registered handler
**When** the card resolves
**Then** the registry dispatches to the handler; the resolver stays exhaustive; no switch on card id is introduced.

## Technical Notes

- Suggested shapes (design intent, implementer freedom on exact structure):
  ```ts
  type CardEffect =
    | { kind: "damage"; amount: number }
    | { kind: "heal"; amount: number }
    | { kind: "drawCards"; amount: number }
    | { kind: "gainCoin"; amount: number }
    | { kind: "buffAtk"; amount: number } // signed
    | { kind: "summon"; unit: "goon" }
    | { kind: "custom"; handlerId: string } // D11 escape hatch

  interface Command<T> {
    execute(ctx: CommandContext): T
    undo(ctx: CommandContext): void
  }

  const CardEffectSchema = z.discriminatedUnion("kind", [...]) // z.infer from CardEffect
  ```
- Layering: JSON packs (`cards/*.json`) → zod-validated loader (`data.ts`) → `CardDef`/`CardEffect` types (`types.ts`) → resolver (exhaustive match + custom registry) → generic command base + queue (execute/undo over snapshot stack). See @wiki/patterns/effects-first-card-model, @wiki/patterns/valid-targets-single-source-of-truth, @wiki/patterns/snapshot-state-sync.
- Undo mechanism: the engine already uses immutable `clone()` + snapshot sync (Memento — @wiki/patterns/snapshot-state-sync). The undo stack is a history of pre-action `GameState` snapshots; execute pushes, undo pops. This avoids per-effect inverse logic entirely (the Command source's caution: every mutation must go through the command or undo breaks).
- D10 nuance: end turn executes through the command base (uniformity) but clears the history — so enemy-phase commands exist outside the undo stack. Enemy-phase `EnemyStep` conformance is mechanical (same base), not a re-architecture.
- The current `castCard` switch is the reference oracle for parity tests (D4). Capture its behavior in red tests FIRST, then replace the switch.
- References: @wiki/reference/design-patterns-gof (Visitor, Command, Memento, CoR mapping); @wiki/reference/sts2-architecture-command-pipeline (GameActionQueue model, D9; code-vs-data counterpoint, D8); @wiki/rules/tdd (red-green-refactor); gameprogrammingpatterns.com/command.html (Command as base; undo/redo payoff for turn-based games).

## Open Questions

- None blocking — all gray areas resolved in exploration. (Undo-stack placement — engine module vs hook — is an implementation decision for planning; pack file layout at 5xx scale is left to planning; command queue async behavior in the hook is left to implementation, constrained by NFR-8/AC-12.)