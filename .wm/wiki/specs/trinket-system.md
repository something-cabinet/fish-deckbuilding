---
title: Trinket System (StS Relic-style)
type: spec
id: wiki:specs:trinket-system
status: draft
tags: [game-design, trinkets, run-state, combat, rewards, ui]
---

## Overview

Add a **Trinket system** — StS-relic-style persistent passive items for *Fish Mafia: Ledger Tactics* — on top of the current Next.js/React/TypeScript engine. Trinkets are unique, permanent run-scoped passives that modify the hero or trigger small effects during battle. They are acquired from treasure nodes, elite/boss wins, story events, and a shop section, and displayed as an icon tray in the battle top bar.

The system follows the existing data-driven convention: trinket definitions live in a new `trinkets/` domain folder (model + library + zod schema), effects reuse the existing `CardEffect` vocabulary, and a pure service applies them at combat-start and trigger seams.

## Locked Decisions

- D1: **Persistent run passives** — trinkets are permanent and carried across every battle in the run (StS relic model, no per-battle loadout).
- D2: **Acquisition everywhere** — treasure nodes (choose-1-of-3), elite/boss drops, story event outcomes, and a shop section sell trinkets for Gold.
- D3: **Effect model** — stat modifiers (maxHp/atk/move) baked at combat start, plus 4 trigger types: `onCombatStart`, `onTurnStart`, `onCardSold`, `onEnemyKilled`. (Full onCardPlayed/onDamageTaken/victory taxonomy deferred.)
- D4: **Content** — ~15 trinkets across 3 rarity tiers (Common/Uncommon/Rare). Treasure pools any tier; elite/boss skew Rare; shop prices scale by tier.
- D5: **Save version** — `SAVE_KEY` bumps from `fish-mafia-save-v2` to `fish-mafia-save-v3`; old saves are discarded (fresh run for existing players).
- D6: **UI** — battle top-bar trinket icon tray with hover tooltip (name + effect); also surfaced on the overworld HUD.
- D7: **Unique + permanent** — no duplicate trinkets; once acquired, kept for the run; no removal/selling.

## Requirements

### Functional Requirements

- FR-1: `OverworldState` gains `trinkets: string[]` (trinket def ids owned by the run, from `createNewRun`).
- FR-2: Trinket definitions are data-driven: `TrinketDef` model with `id`, `name`, `description`, `rarity` ("common" | "uncommon" | "rare"), optional stat modifiers (`maxHp`, `atk`, `move`), and optional trigger effects (`onCombatStart`, `onTurnStart`, `onCardSold`, `onEnemyKilled`), each expressed with the existing `CardEffect` vocabulary.
- FR-3: A `trinket` library (schema-validated, mirroring card packs/zod) contains ~15 authored trinkets across the 3 tiers.
- FR-4: Battle setup carries owned trinkets from the run into `GameState` via a `createInitialState` override; battle stores active trinket ids.
- FR-5: **Stat modifiers** are applied to the hero unit at combat start (maxHp raises max and current? No — current HP unchanged; atk adds to base attack; move adds to move range). Effects are visible in-battle.
- FR-6: **Trigger effects** fire at the seams: `onCombatStart` after battle init; `onTurnStart` in `beginPlayerTurn`; `onCardSold` in `sellCard`; `onEnemyKilled` in `cleanupDead`. Multiple trinkets firing at the same moment resolve in acquisition order (index in `trinkets` array).
- FR-7: Trigger effects reuse `resolveCardEffects`-style application: `gainCoin`, `drawCards`, `heal` (target "caster" = hero), `buffAtk`, and `custom` handlers registered in the existing registry.
- FR-8: **Treasure nodes** offer a choose-1-of-3 trinket reward alongside the existing gold/card reward (`rollTreasure` extended; excluded trinkets are already-owned).
- FR-9: **Elite and boss wins** award a trinket drop alongside existing card rewards — weighted toward Uncommon/Rare for elites, Rare-heavy for bosses.
- FR-10: **Events** add trinket choices to the event outcome schema (`choice.trinket`), usable by existing events and new content.
- FR-11: **Shop** gains a trinket section: seeded inventory of 1-2 trinkets priced by rarity (excludes owned trinkets).
- FR-12: Duplicate prevention — a trinket already in `overworld.trinkets` never appears in reward rolls, event choices, or shop inventory.
- FR-13: Battle top bar renders a trinket icon tray; hovering a trinket shows name + description tooltip.
- FR-14: Overworld HUD surfaces owned trinkets (icon row with tooltips).
- FR-15: Save/load: v3 schema persisted/restored; `isValidSave` validates `trinkets: string[]`; `loadSave` backfills missing `trinkets` (defensive) and discards unknown ids.

### Non-Functional Requirements

- NFR-1: All trinket logic lives in pure services (`trinket.service` etc.), zero React deps, deterministic and unit-testable — mirroring the card/effect service convention.
- NFR-2: TDD — new engine tests (vitest) for stat baking, every trigger, duplication exclusion, reward weighting, and save round-trip; render tests for the tray/tooltip per the existing StrictMode pattern.
- NFR-3: Rarity weighting uses the seeded run RNG so rewards are deterministic per (seed, node) — no `Math.random` in engine paths.
- NFR-4: Existing behavior is preserved when `trinkets` is empty (no stat/trigger/cost changes).

## Acceptance Criteria

- [ ] AC-1: `OverworldState.trinkets` exists, starts `[]`, round-trips through save v3 (create → save → load → identical).
- [ ] AC-2: A trinket with a stat modifier changes the hero's stat in battle (e.g., maxHp +5 → hero maxHp reflects it; current HP unchanged).
- [ ] AC-3: Each of the 4 triggers fires its effects in battle: onCombatStart (draw/gainCoin), onTurnStart, onCardSold (bonus Coin), onEnemyKilled (heal/fin).
- [ ] AC-4: Multiple triggers at one moment resolve in acquisition order; effects match expectation in a test with two trinkets on the same trigger.
- [ ] AC-5: Treasure node offers exactly 3 distinct, unowned trinkets plus existing gold/card rewards; picking adds it to `OverworldState.trinkets` and clears the node.
- [ ] AC-6: Elite and boss reward screens include a trinket pick; boss rewards contain only Uncommon/Rare trinkets.
- [ ] AC-7: An event choice can grant a trinket and the reward flow completes.
- [ ] AC-8: Shop shows 1-2 trinkets priced by rarity; buying deducts Gold, adds to `trinkets`, excludes owned trinkets.
- [ ] AC-9: Owned trinkets never appear in any roll/choice/inventory (duplicate prevention).
- [ ] AC-10: Battle top bar renders the trinket tray with hover tooltips; empty tray renders nothing.
- [ ] AC-11: Overworld HUD shows owned trinket icons.
- [ ] AC-12: `SAVE_KEY` = `fish-mafia-save-v3`; a v2 save is not loaded (discarded).
- [ ] AC-13: A run with zero trinkets behaves identically to today (all engine + render + e2e tests pass).
- [ ] AC-14: Full vitest suite + `npm run build` green.

## Scenarios

### Scenario 1: Treasure Pickup (Happy Path)
**Given** the hero reaches a Treasure node with 4 owned cards and 0 trinkets
**When** the treasure reward screen opens
**Then** it shows 3 distinct unowned trinket offers (plus the existing gold/card reward)
**When** the hero picks the "Gold Pinky Ring" (Common, onCardSold: +2 Coin)
**Then** "Gold Pinky Ring" is added to `OverworldState.trinkets`, the node clears, and interest accrues
**Then** entering the next battle shows the ring icon in the top-bar tray

### Scenario 2: Trinket Triggers in Battle
**Given** the run owns "Gold Pinky Ring" (onCardSold +2 Coin) and "Shark Tooth" (maxHp +5)
**When** a battle starts
**Then** hero maxHp is 5 higher (current HP unchanged), and an onCombatStart trinket (if owned) resolves its effect once
**When** the hero sells a card worth 2 Coin
**Then** Coin gained is 4 (2 + 2 from the ring)
**When** the hero defeats an enemy
**Then** any onEnemyKilled effect resolves (and Fin is still +1)

### Scenario 3: Elites/Bosses Skew Rare
**Given** the seeded run fights a Zone 1 boss
**When** the victory reward screen appears
**Then** the trinket offer contains only Uncommon/Rare trinkets
**Then** the pick is deterministic for (seed, node) — replaying the run offers the same choices

### Scenario 4: Duplicate Prevention
**Given** the run already owns "Gold Pinky Ring"
**When** any reward roll, event pool, or shop inventory is generated
**Then** "Gold Pinky Ring" never appears

### Scenario 5: Shop Purchase
**Given** the hero has 60 Gold at a Shop node and the shop seeds an Uncommon trinket priced 45 Gold
**When** the hero buys it
**Then** Gold drops to 15 and the trinket joins `OverworldState.trinkets`
**When** the hero re-enters the shop
**Then** that trinket is no longer offered

### Scenario 6: No Trinket State (Regression)
**Given** a fresh run with no trinkets
**When** any battle plays out
**Then** stats, triggers, and all existing behaviors are byte-identical to today

### Scenario 7: Old Save Discarded
**Given** a browser with a `fish-mafia-save-v2` run saved
**When** the app boots
**Then** the save is rejected and the New Run flow starts

## Technical Notes

- Run state: `src/lib/game/overworld-types.ts` (`OverworldState`), seeded creation `createNewRun`, `loadSave`/`isValidSave` in `src/lib/game/overworld-engine.ts`.
- Battle bridge: `createInitialState(overrides)` in `src/lib/game/battle/services/state.service.ts` (add `trinkets` override); wired from `src/hooks/use-overworld.ts` `buildBattleState`.
- Trigger seams: `beginPlayerTurn` (`battle/services/turn.service.ts`), `sellCard` (`actions/actions.service.ts`), `cleanupDead` (`units/services/combat.service.ts`), combat start (`createInitialState`).
- Effect vocabulary reuse: `CardEffect` union (`cards/models/card-effect.model.ts`) + `resolveCardEffects`/custom handler registry (`cards/services/effects.service.ts`). Heal target "caster" = hero.
- Reward seams: `rollTreasure`, `rollRewards`, `rollEliteRewards` (`overworld-engine.ts`), `EVENTS`/choice schema (`overworld-data.ts`, `applyEventChoice`), `shopInventory` (extend for a trinket section).
- UI: battle `top-bar.tsx` tray + tooltip; `reward-screen.tsx` pattern for a trinket pick variant; overworld HUD (hero stats area in `fish-mafia-app.tsx`).
- Theme (PRODUCT.md/DESIGN.md): underworld fish-mafia flavor — e.g., Gold Pinky Ring (onCardSold), Shark Tooth (maxHp), Crooked Badge (onEnemyKilled heal), Pawn Ticket (onTurnStart coin). Final 15 authored during implementation.
- New domain folder `src/lib/game/trinkets/`: `trinket-def.model.ts`, `trinket-library` (schema-validated defs), `trinket.service.ts` (stat baking + trigger resolution), barrel `index.ts`.

## Open Questions

- [ ] OQ-1: **Shop price curve** — exact Gold price per tier (e.g., Common 30 / Uncommon 45 / Rare 70?). Locks during implementation balancing.
- [ ] OQ-2: **Trigger stacking limits** — the onEnemyKilled heal may need a cap or remain unbounded for early balancing.
- [ ] OQ-3: **Final 15 trinket content** — exact ids/effects/tiers are authored during implementation; the four named examples above are proposals, not commitments.