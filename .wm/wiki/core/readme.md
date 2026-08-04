---
title: Fish Roguelite Deckbuilding — README
type: core
tags: [core, readme]
status: reviewed
---

---
title: Fish Roguelite Deckbuilding — README
type: core
status: reviewed
tags: [core, readme]
---

# Fish Mafia: Ledger Tactics

A tactical deckbuilding game about **Guppy the Debtor** — a fish trying to escape the mafia underworld. Grid combat with a mana-costed card hand, built with **Next.js 16 + React 19 + TypeScript + Tailwind v4**. The engine is pure React-free TypeScript in `src/lib/game/` (see wiki:specs/angular-style-file-system for the file convention).

## Quick Start

```bash
npm install        # install dependencies
npm run dev        # start the dev server
npm test           # run the Vitest suite (127 tests)
npm run test:coverage  # run tests + coverage report (threshold gate: 75/75/75/55)
npm run build      # production build
```

## Core Gameplay

**Combat:** grid-based battle (9×5). Move units, attack adjacent enemies with base attack, and play mana-costed cards from your hand (damage, heal, draw, coin gain, buffs, summons — data-driven effects resolved by `effects.service.ts`). Turn-based: player phase → enemy AI turn, with snapshot-based undo/redo committed at End Turn.

**Hero (Guppy):** HP-based, base attack, active unit on the grid. Debt/coin economy: earn coins in combat, buy/sell cards, foreclosure pressure as a fail state.

**Campaign:** overworld progression between battles, card library, card crafting/creation UI — see wiki:specs:fish-tactical-rpg for the design intent (tech references in that spec predate the current JS stack).

## Current State (implemented)

- App shell with screen switching: menu / game / card library / card create (`src/components/game/fish-mafia-app.tsx`)
- Battle UI: board, unit tokens, hand, targeting arrow, particle FX, top bar, side panel, result overlay
- Pure TS engine in `src/lib/game/` — cards, units, battle, deck domains + function folders (actions/commands/session), zero React dependencies, unit tested via `npm test`
- Data-driven card effects with a resolver + custom-effect registry (see wiki:specs:card-effect-registry)
- Card library + custom card creator (display-only custom cards)
- Coverage gate: `npm run test:coverage` (v8, owned-code include, thresholds)

## Key Files

| Path | Purpose |
|------|---------|
| `src/app/page.tsx` | Server entry → `FishMafiaApp` |
| `src/components/game/` | App shell, screens, battle widgets (one component per file) |
| `src/hooks/use-fish-mafia.ts` | The only UI ↔ engine bridge (state snapshot + actions) |
| `src/lib/game/cards/` | Card types, enums, constants, services, JSON packs + zod schema |
| `src/lib/game/units/` | Unit types, enums, combat service, defs |
| `src/lib/game/battle/` | GameState, FxEvent, Phase, board/rules services |
| `src/lib/game/actions\|commands\|session/` | Player use-cases, command bus, undo/redo |
| `src/lib/game/data.ts` | CARD_LIBRARY, STARTER_DECK, ENEMY_SPAWNS |
| `src/lib/game/index.ts` | Root barrel |
| `wiki:specs:angular-style-file-system` | File system convention |
| `wiki:specs:domain-layered-engine-structure` | Domain/function-first engine structure |
| `wiki:specs:card-effect-registry` | Engine command/effect architecture |

## Full Specs

@wiki/specs/angular-style-file-system (file system convention)
@wiki/specs/domain-layered-engine-structure (engine structure)
@wiki/specs/card-effect-registry (engine architecture)
@wiki/specs/fish-tactical-rpg (game design intent)
