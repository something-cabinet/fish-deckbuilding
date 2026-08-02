---
title: spec
type: core
id: wiki:core:spec
status: reviewed
relates_to:
  - {type: relates_to, target: wiki:core:agent}
---

# spec.md — Upcoming Features

Feature specs for the next iterations of **Fish Mafia: Ledger Tactics**.
Each spec is written so an agent can pick it up standalone. Status legend:
`PLANNED` · `IN PROGRESS` · `PARTIAL` (partly implemented, remainder planned) · `DONE`.
See @wiki/core/agent for architecture rules. **Current state (verified against source):**
in-combat deck economy (buy/sell) is implemented in the engine; the between-fights
builder, campaign, audio, statuses, and undo are not.

---

## F-1 · Deck Building Between Fights — `PARTIAL`

**Goal:** Let the player shape their deck using earned coin.

**User story:** After winning a fight, I see a shop of cards, buy new ones with
coin, and remove weak cards before the next fight.

**Implemented so far (in-engine, in-combat)**
- `sellCard` in `engine.ts` — sell a hand card for `value + floor(interest / 4)`
  coin (interest bonus grows as the game drags on).
- `buyCard` + `BUY_COST = 3` — spend 3 coin to draw a random card from your deck
  into hand ("black market" buy). Only on the player phase and while hand < 8.
- UI: per-card SELL button on `card.tsx`; "Buy Card · 3" button in the bottom bar
  of `fish-mafia-game.tsx` (disabled when out of coin or hand full).

**Still planned**
- A separate `deck-builder` screen shown between scenarios (not mid-combat).
- Run-level state above `GameState` (`RunState`: deck list + coin + scenario
  index); `startGame(runDeck)` seeds the fight deck instead of `STARTER_DECK`.
- Deck size floor/ceiling (e.g. 8–16 cards) and remove-card refunds.

**Acceptance**
- [ ] Winning routes to the builder, not straight to restart.
- [ ] Purchases persist into the next fight's draw pile.
- [ ] Deck size floor/ceiling enforced (e.g. 8–16 cards).
- [ ] No randomness during render; shuffle only at fight start.

---

## F-2 · Multiple Scenarios / Campaign — `PLANNED`

**Goal:** A short ladder of fights with escalating enemy layouts.

**Scope**
- Today `data.ts` has a single encounter: `ENEMY_SPAWNS` (2 Thugs, 2 Enforcers,
  The Boss) spawned by `createInitialState`. Convert this into
  `SCENARIOS: Scenario[]` with per-fight enemy spawns, board notes, and a
  foreclosure-clock length.
- Track `scenarioIndex` in `RunState`; advance on win, reset run on loss.
- Simple map/intermission screen listing completed and upcoming fights.

**Acceptance**
- [ ] At least 3 distinct enemy layouts of rising difficulty.
- [ ] Boss appears only in the final fight.
- [ ] Losing returns to fight 1 with the starter deck.

---

## F-3 · Sound & Music — `PLANNED`

**Goal:** Audio feedback for casts, hits, moves, coin, and win/lose.

**Scope**
- Native `<audio>` elements + a tiny `useSound` helper (no heavy libs).
- Trigger SFX from the hook's FX queue so sound stays in sync with particles.
- Global mute toggle in the top bar; respect `prefers-reduced-motion` for
  screen-shake but keep audio independent.

**Acceptance**
- [ ] Cast, hit, move, coin, victory, defeat each have a distinct cue.
- [ ] Mute persists for the session and defaults to on-but-quiet.
- [ ] No autoplay before first user interaction (browser policy).

---

## F-4 · Status Effects (Bleed / Frozen / Shielded) — `PLANNED`

**Goal:** Add depth via lingering effects that tick on turn boundaries.

**Scope**
- Extend `Unit` with a `statuses: Status[]` array (`kind`, `amount`, `turns`).
  Note: single-attribute debuffs already exist via `buffAtk` (Kneecap applies
  -1 ATK; Interest every 4 turns applies +1 ATK to enemies) — a statuses array
  generalizes this.
- Resolve ticks in `endTurn` / `beginPlayerTurn` (pure), emitting FX per tick.
- New card effects can apply statuses; render status pips on `unit-token`.

**Acceptance**
- [ ] Bleed deals damage at turn start; Frozen skips a unit's action; Shield
      absorbs the next hit.
- [ ] Status pips visible on tokens and cleared correctly at 0 turns.
- [ ] All tick logic stays in the engine (React-free, returns new state).

---

## F-5 · Undo Last Action (pre-End-Turn) — `PLANNED`

**Goal:** Let players undo a move/cast before ending the turn to reduce misclicks.

**Scope**
- Hook keeps a bounded stack of `GameState` snapshots for the current turn only.
- `undo()` pops to the previous snapshot; cleared on End Turn and disabled
  during the enemy phase (`busy`).
- Undo button near End Turn; keyboard shortcut (e.g. `Z`).

**Acceptance**
- [ ] Undo restores position, HP, hand, mana, coin exactly.
- [ ] Cannot undo across turn boundaries or during enemy turns.
- [ ] Stack is bounded (no unbounded memory growth).

---

## Non-goals (for now)
- Online multiplayer / networking.
- Server persistence or accounts (game stays client-only).
- Procedural card generation.