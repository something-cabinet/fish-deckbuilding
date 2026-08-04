---
title: Battle Economy — Coin (Play Resource) + Fin (Upgrade Currency)
type: spec
status: locked
tags:
  - game-design
  - combat
  - economy
  - cards
  - ui
---

## Overview

Rework the in-battle economy from the current `mana` + `coin` model into a
`coin` + `fin` model, and rewire the sell/play loop.

Today the battle has two resources:

- **`mana` / `maxMana`** — a per-turn resource that resets each turn, ramps
  `+1/turn`, and is spent to play cards (`card.def.cost <= state.mana`).
- **`coin`** — a *persistent* in-battle currency earned by selling cards
  (`sellCard`) and spent on the black-market **Buy Card** action (`buyCard`,
  `BUY_COST`).

This spec renames and repurposes both, in a single coordinated change:

- The per-turn play resource `mana` becomes **Coin**. Cards cost Coin to play.
- **Selling a card is now the primary way to earn Coin.** You mostly fund your
  turn by selling cards from hand; only a few cards generate Coin on their own.
- The persistent currency `coin` becomes **Fin** — a meta/upgrade currency that
  survives across the run and will feed a card-upgrade system.
- **Buy Card is removed from battle.** Deck growth happens through overworld
  rewards/shop, not mid-battle.
- The Coin readout replaces the conic-gradient **mana dial** in the HUD with a
  **register**-style counter.
- Selecting a card shows a **"right-click to cancel"** hint (with an icon), and
  right-clicking anywhere cancels the current card selection/targeting.

> **Naming collision warning.** This is a *two-way* rename done at once:
> old `mana` → new `coin`, and old `coin` → new `fin`. A naive find-replace of
> "coin" will corrupt the old-coin→fin rename. The rename inventory below is the
> source of truth — do old-`coin`→`fin` **first**, then old-`mana`→`coin`.

## Locked Decisions

- **D1 — Sell = Coin only; drop Buy Card.** A card in hand can be **Played**
  (spend Coin) or **Sold** (gain Coin this turn). The mid-battle **Buy Card**
  action is removed entirely.
- **D2 — Persistent currency is named `Fin`.** (old `coin` → `fin`.)
- **D3 — Coin income is scarce.** There is **no per-turn Coin ramp** and no
  large base income. You earn Coin almost entirely by **selling cards**; a small
  subset of cards generate Coin when played.
- **D4 — Coin resets each turn.** Unspent Coin is lost at the start of the next
  player turn (same lifecycle the old `mana` had).
- **D5 — Register UI replaces the mana dial.** The conic-gradient dial is swapped
  for a register/counter readout of current Coin.
- **D6 — Right-click cancels selection.** A visible hint ("right-click to
  cancel" + icon) appears while a card is selected; right-click (contextmenu)
  clears the selection and any targeting overlay.
- **D7 — `COIN_TURN_BASE = 0`.** Each turn starts at 0 Coin. Pure sell-to-play;
  no base income. (locks OQ-1)
- **D8 — `sellValue = max(1, cost)`.** Selling yields Coin equal to the card's
  cost, floored at 1, unless the card authors an explicit `sellValue`. (locks OQ-2)
- **D9 — Coin-income cards.** Add one new starter card **"Shakedown"** (cost 0,
  `GainCoin 2`) and tag 1–2 existing low-impact starter cards with a small
  `GainCoin`. This is the only non-sell Coin source. (locks OQ-3)
- **D10 — Fin reward = `+1` per enemy defeated.** No separate flat victory
  bonus in this phase. (locks OQ-4)
- **D11 — Fin is run-scoped.** Fin accumulates across battles within a run and is
  surfaced to the overworld for a future card-upgrade shop; it is not reset
  between battles. (locks OQ-5)
- **D12 — New register component.** Author a lightweight segmented-digit register
  component for the Coin readout, reusing existing coin iconography/FX. (locks OQ-6)

## Terminology & Rename Inventory

| Concept | Old name | New name | Meaning |
|---|---|---|---|
| Per-turn play resource | `mana`, `maxMana` | `coin`, `maxCoin` | Reset each turn, spent to play cards. |
| Persistent currency | `coin` | `fin` | Survives the run; spent on upgrades. |
| Card price | `card.def.cost` | `card.def.cost` (unchanged) | Now denominated in Coin. |
| Sell reward | `SELL_VALUE`→`coin` | `sellValue`→`coin` | Selling now grants **Coin**, not Fin. |
| Buy action | `buyCard`, `BUY_COST`, `{kind:"buy"}` | **removed** | No mid-battle buying. |

### Files touched (verified against current tree)

Rename `coin` → `fin` **first** in:

- `src/lib/game/battle/models/game-state.interface.ts` (`coin` field)
- `src/lib/game/battle/services/state.service.ts` (init)
- `src/lib/game/actions/actions.service.ts` (`sellCard`, `buyCard`)
- `src/lib/game/battle/enums/fx-kind.enum.ts` (coin FX kind, if present)
- `src/components/game/top-bar.tsx`, `result-overlay.tsx`, `particle-canvas.tsx`,
  `board.tsx`
- specs/tests referencing the persistent counter:
  `fish-mafia-game.economy.spec.tsx`, `result-overlay.render.spec.tsx`,
  `card-parity.spec.ts`, `commands.spec.ts`, `history.spec.ts`

Then rename `mana`/`maxMana` → `coin`/`maxCoin` in:

- `src/lib/game/battle/models/game-state.interface.ts`
- `src/lib/game/battle/services/turn.service.ts` (remove ramp; reset to base)
- `src/lib/game/battle/services/state.service.ts`
- `src/lib/game/actions/actions.service.ts` (`castCard` cost check/deduct)
- `src/lib/game/cards/services/targeting.service.ts` (`canCast`)
- `src/lib/game/cards/models/card-def.interface.ts` (comment/naming only; `cost`)
- `src/components/game/fish-mafia-game.tsx`, `card.tsx`, `card-create-screen.tsx`
- `src/lib/game/overworld-data.ts` (any card authoring notes)
- tests: `turn.service.spec.ts`, `commands.spec.ts`, `history.spec.ts`,
  `card-parity.spec.ts`, strictmode specs

## Implementation Notes (as-built)

Two simplifications were adopted during implementation and supersede the draft
wording below:

- **No `maxCoin`/cap.** Because the base is `0` (D7) and Coin comes only from
  selling and income cards, there is no per-turn cap to store. `maxMana`/`maxCoin`
  was removed entirely rather than renamed; each turn simply resets `coin` to
  `COIN_TURN_BASE`. Ignore `maxCoin` references in FR-1/FR-4 below.
- **Sell value reuses `card.def.value`.** Rather than add a new `sellValue`
  field, the existing authored `value` field is the per-card sell price, floored
  at 1 (`max(1, card.def.value)`); starter card `value`s were set equal to their
  `cost` to satisfy D8. `card.def.cost` is not consulted for selling.
- **Fin awarded in `cleanupDead`** (units combat service): `+1` per enemy unit
  removed, then read back to the overworld via `onWin(heroHp, fin)` →
  `updateHp(hp, fin)`; `createInitialState({ fin })` carries it back in (D11).

## Requirements

### Functional

- **FR-1** `GameState.coin: number` is the per-turn play resource (replaces
  `mana`). `GameState.maxCoin: number` is the per-turn cap/base.
- **FR-2** `GameState.fin: number` is the persistent currency (replaces the old
  `coin`). It is **not** reset between turns and persists across the battle.
- **FR-3** Playing a card requires `card.def.cost <= state.coin`; on play,
  `state.coin -= card.def.cost` (was `state.mana`).
- **FR-4** **No Coin ramp.** At the start of each player turn `coin` resets to
  `maxCoin` (default base **0**; configurable constant `COIN_TURN_BASE`). The old
  `maxMana += 1/turn` ramp is removed.
- **FR-5** **Selling** a card sets `state.coin += sellValue(card)` (was
  `state.coin`/persistent). Sold card goes to the graveyard. `sellValue` default
  = `max(1, card.def.cost)` unless the card defines an explicit `sellValue`.
  A card may be sold OR played in a turn, not both (selling consumes it).
- **FR-6** **Coin-income cards.** A small subset of cards carry a
  `GainCoin(n)` effect (new `Effect` variant) that adds Coin when the card is
  played. This is the only non-sell Coin source in battle.
- **FR-7** Unspent Coin is lost when the next player turn begins (reset in
  `turn.service`). Fin is never reset by turn flow.
- **FR-8** **Remove Buy Card**: delete `buyCard`, `BUY_COST` battle usage, and
  the `{ kind: "buy" }` command + its dispatch in `commands.service.ts`. Remove
  the Buy Card button/handler from `fish-mafia-game.tsx`.
- **FR-9** **Fin source.** Fin is granted by combat rewards (e.g. per enemy
  defeated and/or on victory), not by selling. Exact numbers in Open Questions;
  default: `+1 Fin` per enemy defeated, tracked on `GameState.fin`.
- **FR-10** Fin is reserved for a **card-upgrade** sink (rest/shop upgrade).
  Spending Fin is a later phase; this spec only requires it to accumulate and
  display.

### UI

- **FR-11 — Coin register.** Replace the conic-gradient mana dial in the HUD
  with a register readout showing current `coin` (and `maxCoin` when > 0). Style
  as a segmented cash-register/counter consistent with the fish-mafia theme
  (gold on ocean-deep). It updates immediately on play/sell.
- **FR-12 — Fin readout.** Show Fin in the persistent stats cluster (top bar)
  with its own icon/label, distinct from Coin and from overworld Gold/Debt.
- **FR-13 — Card cost display.** The cost badge on each card face now reads as
  Coin (icon + number). Affordability styling keys off `coin` (dim/disabled when
  `cost > coin`).
- **FR-14 — Sell affordance.** Each card in hand exposes a Sell action showing
  the Coin it yields (e.g. "Sell +2").
- **FR-15 — Right-click cancel hint.** While a card is selected/targeting, show
  a hint near the cursor/hand: an icon (mouse right-button / `MousePointer2` or
  `Undo2`) + text "Right-click to cancel".
- **FR-16 — Right-click cancel behavior.** A `contextmenu` event (right-click)
  anywhere on the board/hand while a card is selected cancels the selection,
  clears the targeting overlay, and suppresses the browser context menu
  (`e.preventDefault()`). Escape key does the same.

### Non-Functional

- **NFR-1** All economy logic stays in pure services (`actions`, `turn`,
  `state`), zero React deps, unit-testable and deterministic.
- **NFR-2** The rename is behavior-preserving for card *play* (same cost check,
  same reset lifecycle) except the removed ramp and removed Buy.
- **NFR-3** No literal `mana` identifier remains in `src` after the change
  (grep-clean); no old persistent-`coin` semantics remain.
- **NFR-4** Right-click cancel must not trigger a browser context menu and must
  not fire a card play.

## Acceptance Criteria

- [ ] AC-1 `GameState` has `coin`, `maxCoin`, `fin`; no `mana`/`maxMana`.
- [ ] AC-2 Playing a card deducts Coin; blocked when `cost > coin`.
- [ ] AC-3 Coin resets to `COIN_TURN_BASE` at start of player turn; no ramp.
- [ ] AC-4 Selling a card adds Coin (`sellValue`) and sends it to graveyard.
- [ ] AC-5 Unspent Coin is lost across the turn boundary; Fin is not.
- [ ] AC-6 `GainCoin(n)` effect adds Coin on play; at least one starter card uses it.
- [ ] AC-7 Buy Card is gone: no `buyCard`, `BUY_COST` battle use, or `"buy"` command/button.
- [ ] AC-8 Fin accumulates from combat rewards and displays in the top bar.
- [ ] AC-9 HUD shows a Coin register (not the old dial); value updates on play/sell.
- [ ] AC-10 Card cost badge + affordability styling read off Coin.
- [ ] AC-11 Selecting a card shows a "Right-click to cancel" hint with an icon.
- [ ] AC-12 Right-click while selecting cancels selection, clears overlay, no browser menu, no play.
- [ ] AC-13 Escape also cancels selection.
- [ ] AC-14 `grep -ri "\bmana\b" src` returns no gameplay identifiers.
- [ ] AC-15 Full test suite passes; economy specs updated for Coin/Fin.

## Scenarios

### Scenario 1 — Sell to afford a play
**Given** it is the player turn with `coin = 0` and a hand of {Tail Slap (cost 2), Splash (cost 0), Scale Throw (cost 1)}
**When** the player Sells Splash (sellValue 1) and Sells Scale Throw (sellValue 1)
**Then** `coin = 2`
**When** the player plays Tail Slap
**Then** `coin = 0`, Tail Slap resolves, all three cards are in the graveyard.

### Scenario 2 — Coin does not carry over
**Given** the player ends the turn with `coin = 3`
**When** the next player turn begins
**Then** `coin` resets to `COIN_TURN_BASE` (0), not 3.

### Scenario 3 — Coin-income card
**Given** the player plays "Shakedown" (cost 0, `GainCoin 2`)
**Then** `coin += 2` immediately, funding further plays this turn.

### Scenario 4 — Fin persists and accrues
**Given** `fin = 0`
**When** the player defeats two enemies over two turns
**Then** `fin = 2` and is unchanged by turn resets; it displays in the top bar.

### Scenario 5 — Right-click cancels
**Given** the player has selected "Tail Slap" and valid targets are highlighted
**When** the player right-clicks anywhere on the board
**Then** the selection clears, the targeting overlay disappears, no browser
context menu opens, and no card is played. The "Right-click to cancel" hint is
hidden once nothing is selected.

## Open Questions

All resolved and folded into Locked Decisions (2026-08-04):

- [x] OQ-1 → **D7**: `COIN_TURN_BASE = 0`.
- [x] OQ-2 → **D8**: `sellValue = max(1, cost)`.
- [x] OQ-3 → **D9**: add "Shakedown" (cost 0, GainCoin 2) + tag 1–2 low-impact starters.
- [x] OQ-4 → **D10**: Fin `+1` per enemy defeated.
- [x] OQ-5 → **D11**: Fin is run-scoped, surfaced to the overworld.
- [x] OQ-6 → **D12**: new lightweight register component, reusing coin iconography.
