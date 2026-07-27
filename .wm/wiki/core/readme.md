---
title: Fish Roguelite Deckbuilding — README
type: core
id: wiki:core:readme
tags: [core, readme]
---

# Fish Roguelite Deckbuilding

A roguelite deckbuilding RPG about **Guppy the Debtor** — a fish trying to pay off debt in an underwater city. Built with Excalibur.js + Svelte 5.

## Quick Start

```bash
npm install
npm run dev       # dev server on localhost:5173
npm test          # 79 tests, ~500ms
npm run build     # production build
```

## Core Gameplay

**Combat:** Slay the Spire-style direct targeting. Click enemy to attack.
**Resources:** FaB-style coin system — sell cards for coins, reset each turn. Credit limit -5. Interest damage if in debt.
**Cards:** 3 purposes per card — SELL (coins), PLAY (attack), BLOCK (defense).
**Sell pile:** Sold cards go to a temporary pile. You reorder them at end of turn → bottom of deck.
**Enemy AI:** Per-unit strategies: aggressive, balanced, defensive.
**Deckbuilding:** Add cards after combat, remove at shops, recruit allies.

## Hero: Guppy the Debtor

| Stat | Value |
|------|-------|
| HP | 30 |
| Max Hand | 4 |
| Credit Limit | -5 |
| Skill | Overdraft — borrow up to -5 coins |

Starter deck: 10 cards (3 Fin Slash, 2 Bubble Shield, 2 Ink Cloud, 1 Desperate Strike, 1 Take Cover, 1 Small Loan).

## Current State

- 39 cards, 6 encounters, 5 relics
- 79 tests passing
- Full roguelite loop: map → combat → rewards → shop → rest → boss
- TDD + SDD workflow enforced

## Key Files

| Path | Purpose |
|------|---------|
| `src/game/combat/` | Game logic (79 tests) |
| `src/game/cards/cardData.ts` | 39 card definitions |
| `src/game/enemies/encounterData.ts` | 6 encounters |
| `src/ui/` | Svelte 5 UI components |
| `src/lib/state.ts` | Run/combat state split |
| `AGENTS.md` | Project rules (SDD + TDD) |
| `wiki:specs:fish-roguelite-deckbuilding` | Full game spec |

## Full Spec

@wiki/specs/fish-roguelite-deckbuilding
