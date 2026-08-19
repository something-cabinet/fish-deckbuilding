---
tags:
- engine
- refactor
- reducer
- undo
- strictmode
- architecture
title: Engine Reducer Rewrite — teardown of command/session machinery
type: spec
status: approved
---

## Overview

The engine currently wraps pure action functions (`moveUnit`, `castCard`, `sellCard`, `unitAttack`) in a stack of machinery — `CommandQueue`, mutable `GameSession` (memento undo/redo), a hook-side `stateRef`/`commit()`/`drain()` dance to survive React StrictMode, and a duplicate trinket effect resolver — whose layers compensate for each other's failures:

- The command queue never accumulates more than one command (every action enqueues then drains synchronously); the "deterministic replay" (StS2 GameActionQueue parity) claim it justifies is fiction.
- The StrictMode workaround exists precisely because the session is mutated inside `setState` updaters, yet `undo`/`redo` still mutate the session inside updaters — under dev StrictMode one undo click pops **two** history entries and duplicates redo entries.
- `sellCard` returns `GameState` instead of `{state, fx}` and drops trinket `onCardSold` fx; `cleanupDead`, `startGame`, and `beginPlayerTurn` also discard trigger fx at their call sites.
- FX events carry duplicate `id: state.logCounter` values, which the UI throws away and re-stamps with its own counter.
- Two effect resolvers exist (cards: 7 kinds; trinkets: a reduced 4-kind copy) plus a custom-effect registry with zero production handlers.
- `beginPlayerTurn` contains an if/else whose two branches are identical.

This spec replaces the machinery with a single pure reducer: `(state, action) => { state, fx }`. The engine stays React-free; the hook becomes a thin dispatch layer; StrictMode correctness is achieved by construction (pure updaters only) instead of by workaround.

## Locked Decisions

- **D1 — Full reducer rewrite.** State transitions go through one pure `reduce(state, action): { state, fx }` (or equivalent pure function composition per the domain-layered structure). `CommandQueue` and the `GameSession` class are deleted.
- **D2 — History in state.** Undo/redo `past[]`/`future[]` live in (or alongside) the state so `undo(s)`/`redo(s)` are pure functions of `s`. No mutable session object, no refs.
- **D3 — Engine-issued unique fx ids.** `GameState` gains an `fxCounter`; every emitted `FxEvent` gets a unique id at emission inside the reducer. The UI stops re-stamping and uses engine ids directly as React keys.
- **D4 — One resolver, delete registry.** Trinket triggers route through the same `resolveCardEffects` resolver (no duplicate switch). The zero-handler custom-effect registry is deleted; future unique behavior adds a real effect kind to the closed `CardEffect` union (compiler-enforced exhaustiveness already forces handling).
- **D5 — Reducer purity replaces the determinism claim.** Same `(state, action)` sequence → same result is now directly testable property of the reducer. The replay seam dies with the queue. `startGame`'s `Math.random` shuffle remains (client-only, once at start).
- **D6 — Enemy steps as pure functions.** `applyEnemyStep(state, step) → {state, fx}` has the same shape as player actions; the hook keeps its async pacing loop (per-step animation delays). The old claim "enemy steps conform to the command shape" becomes literally true — everything is the same pure shape.
- **D7 — Docs updated in-spec.** The rewrite is recorded as an ADR; `card-effect-registry` spec's queue claims are superseded; ARCHITECTURE/CONVENTIONS command-layer descriptions are rewritten; the `pure-setstate-updaters-external-drain` pattern page is marked superseded by the reducer pattern.

## Requirements

### Functional Requirements

- **FR-1:** All player actions (move, attack, playCard, sell, endTurn) are plain-data actions dispatched through the reducer. No per-action classes, no queue, no session.
- **FR-2:** Every action returns `{ state, fx }` with a consistent signature — including `sellCard` (currently returns bare `GameState`).
- **FR-3:** Undo/redo: `undo(s)` pops exactly one history entry and returns the restored state; `redo(s)` re-applies; a new action after undo discards the redo tail; End Turn commits (clears history); enemy-phase steps never enter history. Semantics identical to today's tested behavior.
- **FR-4:** FX events are uniquely id'd by an `fxCounter` maintained in state; ids increment per emission; no duplicate ids within an action's fx batch.
- **FR-5:** Trinket triggers (`onCombatStart`, `onTurnStart`, `onCardSold`, `onEnemyKilled`) resolve through the shared card-effect resolver; their fx events are returned and surfaced to the UI (no dropped fx).
- **FR-6:** `CommandQueue`, `GameSession`, and the custom-effect registry are deleted.
- **FR-7:** Enemy steps apply through the same pure function shape as player actions; the hook's animation pacing (await delays between steps) is preserved.
- **FR-8:** The hook's public API is unchanged — components keep calling `select/move/attack/cast/sell/undo/redo/endTurn/restart` plus `fx/busy/reachable/targetsFor`. No component changes required.
- **FR-9:** No impure `setState` updaters anywhere in the hook — every updater body is a pure function of its argument. StrictMode correctness by construction.
- **FR-10:** Debug surfaces (`debugUpdate`, `debugDrawCards`) keep working with the same semantics.

### Non-Functional Requirements

- **NFR-1:** Engine stays pure React-free TypeScript under `src/lib/game/` (zero React imports).
- **NFR-2:** Existing 127-test baseline stays green (tests asserting on deleted machinery are rewritten to the reducer, not removed).
- **NFR-3:** `npm run build` stays green.
- **NFR-4:** No new circular imports; barrel discipline and layer rules (shared ← units/deck ← cards ← battle ← actions) preserved.
- **NFR-5:** StrictMode dev-mode behavior is correct (undo/redo/enemy-turn) — verified by render tests, not workarounds.

## Acceptance Criteria

- [ ] **AC-1:** grep-verifiable: no `CommandQueue`, no `GameSession`, no `registerCustomEffectHandler`/`customHandlers` anywhere in `src/`.
- [ ] **AC-2:** Hook render test under `<StrictMode>`: `undo()` after two actions pops exactly one step (state matches one-action-back, not two), `redo()` restores, repeated undo/redo round-trips exactly. This test is red against the pre-rewrite hook.
- [ ] **AC-3:** All fx events in a single action carry unique ids (test asserts set of ids has no duplicates); the hook's `fxSeed` re-stamping is gone (grep-verifiable).
- [ ] **AC-4:** Selling a card with an `onCardSold` trinket produces the trinket's fx events in the hook's `fx` queue (render/hook test asserts coin fx emission).
- [ ] **AC-5:** `onTurnStart`/`onCombatStart`/`onEnemyKilled` trigger fx events reach the UI fx queue (no dropped fx at any of the four previous call sites).
- [ ] **AC-6:** Reducer purity: same `(state, action)` sequence replayed against fresh clones yields identical final state (test over the existing commands/history suites' scenarios).
- [ ] **AC-7:** Undo semantics preserved: end-turn commits history; enemy steps never enter the undo stack; new action after undo clears redo (existing `history.spec` scenarios pass against the new implementation).
- [ ] **AC-8:** `npm test` full suite green (127 baseline, rewritten where the machinery is asserted, plus the new reducer/hook tests).
- [ ] **AC-9:** `npm run build` green.
- [ ] **AC-10:** No impure updaters in `use-fish-mafia.ts` (grep-verifiable: updater bodies contain no mutation of refs/classes, only pure calls).
- [ ] **AC-11:** Docs updated: new ADR created; `card-effect-registry` spec queue claims superseded; ARCHITECTURE + CONVENTIONS command/session descriptions rewritten; `pure-setstate-updaters-external-drain` pattern page marked superseded with a link to the reducer pattern.
- [ ] **AC-12:** The identical-branch no-op in `beginPlayerTurn` is removed.

## Scenarios

### Scenario 1: Undo under StrictMode (the bug this rewrite kills)
**Given** dev-mode React StrictMode and a hook instance where the player moved then attacked
**When** the player clicks undo once
**Then** state returns to exactly the post-move/pre-attack state — one step, not two — and a second undo returns to the pre-move state; redo re-applies in reverse.

### Scenario 2: Selling with a trinket shows its fx
**Given** a player holding a card and an `onCardSold` trinket that grants coin
**When** the player sells the card
**Then** coin increases in state and a coin fx event (with a unique id) appears in the hook's `fx` queue — previously dropped.

### Scenario 3: Enemy turn still animates step by step
**Given** an enemy turn with two enemy units moving and attacking
**When** endTurn runs
**Then** the hook applies each step as a separate state transition with the existing inter-step delays, `busy` toggles as before, and no enemy step appears in undo history (undo after end-turn is a no-op).

### Scenario 4: Reducer determinism
**Given** the same initial state and the same action sequence (e.g., sell → cast → move)
**When** the sequence is applied twice to fresh clones of the state
**Then** both runs produce identical final states (deep-equal) — the queue-era determinism property, now structural.

## Technical Notes

- The reducer likely lives in the actions/function layer (e.g., `actions/reducer.service.ts` or per-domain pure services composed by a thin reducer) — placement is a planning decision within the existing function-first + barrel structure.
- `undo`/`redo` become pure functions over `{ state, past, future }`; the hook holds that whole bundle in one `useState` and dispatches pure updaters.
- `startGame` stays a client-only one-shot (shuffle + opening hand) invoked from the mount effect; it may call the reducer or remain a separate pure initializer.
- History bounds: no explicit cap required today (turn-scoped, cleared at End Turn) — a cap is out of scope unless planning finds a leak.
- `fxCounter` must survive `clone()` (add to the clone surface in `engine.helper.ts`).

## Open Questions

- [ ] Should the rewrite also flip `next.config.mjs` `typescript.ignoreBuildErrors` back on (build type-checking)? Currently separate hygiene concern — decide as a spillover task or fold in.