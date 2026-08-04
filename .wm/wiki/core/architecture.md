---
title: Fish Roguelite Deckbuilding — Architecture
type: core
tags: [core, architecture]
status: reviewed
---

# Architecture

## Stack

| Layer | Technology | Role |
|-------|-----------|------|
| App | **Next.js 16** | App router, SSR shell, static prerender |
| UI | **React 19 + Tailwind v4 + shadcn (base-nova)** | Components, screens, styling tokens |
| State bridge | **`src/hooks/use-fish-mafia.ts`** | UI ↔ engine bridge: state snapshot + FX queue + player actions |
| Core domain | **Pure TS (`src/lib/game/`)** | cards, units, battle, deck — zero React dependencies, unit tested |
| Validation | **zod** | Card JSON pack schema; malformed data throws at load |
| Testing | **Vitest** | Engine unit, resolver, command/history, schema, parity tests (`npm test`) |

## Architecture Pattern

```
src/app/page.tsx (server entry)
  → src/components/game/fish-mafia-app.tsx   # app shell — manual screen switch (enum + switch dispatch)
      → screens: menu-screen, card-library-screen, card-create-screen, fish-mafia-game
          fish-mafia-game.tsx  → useFishMafia() hook (src/hooks/use-fish-mafia.ts)
              → battle widgets via props drilling: board, unit-token, card, card-face,
                targeting-arrow, particle-canvas, top-bar, side-panel, result-overlay
                    |
use-fish-mafia.ts → src/lib/game/ (pure engine, function-first, no React)
  - actions/    player use-cases: move, attack, cast, sell, buy (orchestrate across domains)
  - commands/   PlayerCommand + executeCommand + CommandQueue (deterministic action bus)
  - session/    GameSession — snapshot undo/redo, End-Turn commit
  - cards/      models (CardDef/CardEffect/...), services (targeting, effects resolver),
                data (schema, card library, starter deck, JSON packs)
  - units/      models (Team/UnitKind/Unit), services (combat), data (hero/enemy/goon defs)
  - battle/     models (GameState/FxEvent/FxKind/Phase/Pos...), services (board/state/turn)
  - deck/       services (shuffle/drawCards/hand limits)
  - shared/     helpers (nid, resetIds, log, posKey, cellLabel, heroUnit, clone)
```

## File Structure

```
src/
├── app/
│   ├── layout.tsx               # fonts (Inter/Oswald), root layout
│   ├── page.tsx                 # server entry → FishMafiaApp
│   └── globals.css              # Tailwind v4 + ocean-theme tokens + fm-* animations
├── components/
│   ├── game/                    # screens + battle widgets + card-icons (one per file)
│   └── ui/button.tsx            # shadcn base-nova Button
├── hooks/
│   └── use-fish-mafia.ts        # the only UI ↔ engine bridge
└── lib/
    ├── game/
    │   ├── actions/  commands/  session/          # game use-cases + bus + undo/redo
    │   ├── cards/{models,services,data}/          # card types, targeting+resolver, library
    │   ├── units/{models,services,data}/          # unit types, combat, spawns
    │   ├── battle/{models,services}/              # state types, board/state/turn rules
    │   ├── deck/services/                         # draw/shuffle
    │   ├── shared/helpers/                        # pure cross-cutting helpers
    │   ├── index.ts                               # root barrel
    │   └── __tests__/                             # Vitest suite
    └── utils.ts                 # cn() helper (shadcn alias target)
```

Layer rule: shared ← units/deck ← cards ← battle ← {actions, commands, session}. Cross-domain value imports may target a runtime-leaf segment (`battle/models`) but never the battle barrel (avoids runtime cycles — D5 of @wiki/specs/domain-layered-engine-structure).

## Key Architectural Decisions

| Decision | Status | Doc |
|----------|--------|-----|
| Engine structure — function-first domains (models/services/data per domain + top-level actions/commands/session) | Approved | @wiki/specs/domain-layered-engine-structure |
| Angular-style file system — one type/service/helper per file + domain barrels | Approved | @wiki/specs/angular-style-file-system |
| Data-driven card effects with resolver (command pipeline) | Approved | @wiki/specs/card-effect-registry |
| Snapshot-based undo/redo with End-Turn commit | Approved | @wiki/specs/card-effect-registry (D10) |
| Cards as JSON packs with zod schema + loader | Approved | @wiki/specs/card-effect-registry (D8) |
| TDD + SDD workflow | Enforced | @wiki/rules/tdd, @wiki/rules/spec-driven-development |

## Full Specs

@wiki/specs/domain-layered-engine-structure (structure)
@wiki/specs/angular-style-file-system (file convention)
@wiki/specs/card-effect-registry (engine command/effect architecture)
@wiki/specs/fish-tactical-rpg (game design intent)
