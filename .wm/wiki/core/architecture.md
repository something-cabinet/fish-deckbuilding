---
title: Fish Roguelite Deckbuilding — Architecture
type: core
status: reviewed
tags: [core, architecture]
---

# Architecture

## Stack

| Layer | Technology | Role |
|-------|-----------|------|
| App | **Next.js 16** | App router, SSR shell, static prerender |
| UI | **React 19 + Tailwind v4 + shadcn (base-nova)** | Components, screens, styling tokens |
| State bridge | **`src/hooks/use-fish-mafia.ts`** | UI ↔ engine bridge: state snapshot + FX queue + player actions |
| Core domain | **Pure TS (`src/lib/game/`)** | cards, units, battle — zero React dependencies, unit tested |
| Validation | **zod** | Card JSON pack schema; malformed data throws at load |
| Testing | **Vitest** | Engine unit, resolver, command/history, schema, parity tests (`npm test`) |

## Architecture Pattern

```
src/app/page.tsx (server entry)
  → src/components/game/fish-mafia-app.tsx   # app shell — manual screen switch (menu|game|library|create), no router
      → screens: menu-screen, card-library-screen, card-create-screen, fish-mafia-game
          fish-mafia-game.tsx  → useFishMafia() hook (src/hooks/use-fish-mafia.ts)
              → battle widgets via props drilling: board, unit-token, card, card-face,
                targeting-arrow, particle-canvas, top-bar, side-panel, result-overlay
                    |
use-fish-mafia.ts → src/lib/game/ (pure engine, no React)
  - cards/     CardDef, CardEffect, CardTarget, CardType, CardInstance + JSON packs + zod schema
  - units/     Unit, UnitKind, Team
  - battle/    GameState, FxEvent, Phase, Pos, LogEntry, board constants
  - services/  engine.service (reducers + enemy AI), commands.service (command queue),
               effects.service (card-effect resolver), history.service (undo/redo)
  - helpers/   icons.helper (card icon registry)
  - data.ts    CARD_LIBRARY, STARTER_DECK, ENEMY_SPAWNS, HERO/GOON defs
```

## File Structure

```
src/
├── app/
│   ├── layout.tsx               # fonts (Inter/Oswald), root layout
│   ├── page.tsx                 # server entry → FishMafiaApp
│   └── globals.css              # Tailwind v4 + ocean-theme tokens + fm-* animations
├── components/
│   ├── game/                    # screens + battle widgets (one component per file)
│   └── ui/button.tsx            # shadcn base-nova Button
├── hooks/
│   └── use-fish-mafia.ts        # the only UI ↔ engine bridge
└── lib/
    ├── game/
    │   ├── cards/               # card types + JSON packs + zod schema + barrel
    │   ├── units/               # unit types + barrel
    │   ├── battle/              # game state / fx / phase types + barrel
    │   ├── services/            # engine / commands / effects / history + barrel
    │   ├── helpers/             # icons + barrel
    │   ├── data.ts              # card library, starter deck, enemy spawns
    │   ├── index.ts             # root barrel
    │   └── __tests__/           # Vitest suite
    └── utils.ts                 # cn() helper (shadcn alias target)
```

## Key Architectural Decisions

| Decision | Status | Doc |
|----------|--------|-----|
| Angular-style file system — one type/service/helper per file + domain barrels | Approved | @wiki/specs/angular-style-file-system |
| Data-driven card effects with resolver (command pipeline) | Approved | @wiki/specs/card-effect-registry |
| Snapshot-based undo/redo with End-Turn commit | Approved | @wiki/specs/card-effect-registry (D10) |
| Cards as JSON packs with zod schema + loader | Approved | @wiki/specs/card-effect-registry (D8) |
| TDD + SDD workflow | Enforced | @wiki/rules/tdd, @wiki/rules/spec-driven-development |

## Full Specs

@wiki/specs/angular-style-file-system (file system convention)
@wiki/specs/card-effect-registry (engine command/effect architecture)
@wiki/specs/fish-tactical-rpg (game design intent)
