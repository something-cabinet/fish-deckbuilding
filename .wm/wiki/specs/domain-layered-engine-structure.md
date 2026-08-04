---
title: Domain-Layered Engine Structure (Option B)
type: spec
tags: [spec, architecture, refactor, structure, approved]
status: approved
---

# Engine Structure — Function-First Domains

## Overview

Final engine organization for `src/lib/game/`: **function-first domains** — every domain folder owns `models/` (interfaces/types), `enums/`, `constants/`, `services/` (rules + logic), `data/` (content); the game's use-cases live in top-level function folders (`actions/`, `commands/`, `session/`); cross-cutting plumbing lives in `shared/helpers`. Enums and constants each live in their own file inside their domain's `enums/` / `constants/` folder. The old `services/` grab-bag, `helpers/`, root `data.ts`, and the intermediate `rules/`/`application/` layer naming are gone. Pure structural refactor, zero behavior change.

Evolved from: the Angular-style file system (wiki:specs/angular-style-file-system) → a domain-layered pass (`model/rules/application` sub-layers) → final function-first shape adopted after review of established TS/React monorepo conventions: feature/function folders with `services/` + `models/` subfolders, barrels, and `*.service.ts`/`*.model.ts`/`*.enum.ts`/`*.constants.ts` suffixes; a global `rules/` layer is the exception, not the norm.

## Decisions

- D1: **Function-first domains** — each domain is a function area with `models/` (interfaces/types), `enums/`, `constants/`, `services/` (logic), `data/` (content). No `rules/` or `application/` sub-layer names.
- D2: **Enums and constants get their own file and folder, inside their domain** — enums → `enums/*.enum.ts`, constants → `constants/*.constants.ts`, colocated with the domain that owns them (not shared, not embedded in services).
- D3: **Domain ownership** — `cards/` owns models, enums (CardTarget/CardType), constants (BUY_COST), services (targeting + effects resolver), data (schema, card library, starter deck, JSON packs); `units/` owns models (Unit), enums (Team/UnitKind), services (combat), data (hero/enemy/goon defs); `battle/` owns models (GameState/FxEvent/...), enums (Phase/FxKind/EnemyStepKind), constants (COLS/ROWS), services (board/state/turn); `deck/` owns constants (HAND_MAX/HAND_START) + services (draw/shuffle).
- D4: **Game-level function folders** — player use-cases and plumbing are top-level, not nested in a domain: `actions/actions.service.ts` (move/attack/cast/sell/buy — orchestrate across domains), `commands/commands.service.ts` (PlayerCommand + executeCommand + CommandQueue), `session/session.service.ts` (GameSession undo/redo). Rationale: they orchestrate the whole game, not one domain (Evans: one application layer per bounded context).
- D5: **Cross-cutting plumbing in `shared/helpers`** — `nid`, `resetIds`, `log`, `posKey`, `cellLabel`, `heroUnit`, `clone` (pure, type-only imports). `icons` moved OUT of the engine to `src/components/game/card-icons.ts` (lucide-react is presentation). UI-local enums also get own files in components (`screen.enum.ts`, `drag-kind.enum.ts`).
- D6: **Cycle-breaking import rule** — cross-domain value imports target the *leaf segment* when the full domain barrel would create a runtime cycle: cards/units/deck/shared/actions/commands/session import `battle/models`/`battle/enums`/`battle/constants` (runtime-leaf) directly, never the battle barrel. `actions → cards barrel → battle/models` is acyclic. Type-only imports of any barrel are always safe (erased).
- D7: **Duplicate code removed** — effects' private `dealDamage`/`drawCards`/`shuffle` replaced by `units/services/combat` + `deck/services` versions; the `effects ↔ engine` runtime cycle is gone.
- D8: **Child-domain escalation path** — vertical sub-domains are deferred until a unit gains distinct responsibilities + its own model footprint. Known candidate: `run/`/`session` becomes a top-level domain when save/load + run/combat state split lands — GameSession is already game-level (D4).

## Target Structure

```
src/lib/game/
├── index.ts                  # root barrel: actions+commands+session+battle+cards+units+deck+shared
├── actions/                  # function: player use-cases
│   └── actions.service.ts    # moveUnit, unitAttack, castCard, sellCard, buyCard
├── commands/                 # function: command bus + deterministic queue
│   └── commands.service.ts   # PlayerCommand, executeCommand, CommandQueue
├── session/                  # function: undo/redo shell
│   └── session.service.ts    # GameSession (undo/redo, end-turn commit)
├── cards/
│   ├── models/               # card-def, card-effect, card-instance
│   ├── enums/                # card-target.enum, card-type.enum
│   ├── constants/            # economy.constants (BUY_COST)
│   ├── services/             # targeting.service (canCast, cardTargets), effects.service (resolver)
│   └── data/                 # schema.helper, card-library, starter-deck, pack-01-starter.json
├── units/
│   ├── models/               # unit
│   ├── enums/                # team.enum, unit-kind.enum
│   ├── services/             # combat.service (effAtk, dealDamage, cleanupDead)
│   └── data/                 # hero-def, enemy-spawns, goon-def, EnemySpawn
├── battle/
│   ├── models/               # game-state, fx-event, log-entry, pos
│   ├── enums/                # phase.enum, fx-kind.enum, enemy-step-kind.enum
│   ├── constants/            # board.constants (COLS, ROWS)
│   └── services/             # board.service, state.service, turn.service
├── deck/
│   ├── constants/            # hand.constants (HAND_MAX, HAND_START)
│   └── services/             # deck.service (shuffle, drawCards)
└── shared/
    └── helpers/              # engine.helper (nid, resetIds, log, posKey, cellLabel, heroUnit, clone)
```

Layer rule: shared ← units/deck ← cards ← battle ← {actions, commands, session}. Cross-domain value imports use `battle/models`/`battle/enums`/`battle/constants` (runtime-leaf), never the battle barrel (D6).

## Acceptance Criteria

- [x] AC-1: `services/` (grab-bag), `helpers/`, root `data.ts`, and the intermediate `rules/`/`application/` layer names no longer exist under `src/lib/game/`.
- [x] AC-2: God-module decomposed — no file exceeds a single domain/function responsibility.
- [x] AC-3: **Every enum has its own `*.enum.ts` file in its domain's `enums/` folder; every constant has its own `*.constants.ts` file in its domain's `constants/` folder** — no enums/constants embedded in service files (grep-verifiable; `EnemyStepKind`, `HAND_MAX/HAND_START`, `BUY_COST` all extracted).
- [x] AC-4: Runtime dependency graph is acyclic (grep: cross-domain value imports target `battle/models`/`battle/enums`/`battle/constants`, never the battle barrel).
- [x] AC-5: `effects ↔ engine` cycle eliminated; duplicated `dealDamage`/`drawCards`/`shuffle` removed.
- [x] AC-6: `icons` (lucide-react) not imported anywhere under `src/lib/game/`; UI enums (`Screen`, `DragKind`) have own files in components.
- [x] AC-7: `tsc --noEmit` 0 errors; `npm test` green (66 tests, none removed or weakened); `npm run build` green.
- [x] AC-8: Consumers import from domain/function barrels only; no stale `services`/`helpers`/`rules`/`application` import paths remain (grep-verifiable).

Verified 2026-08-04 (final shape + enums/constants extraction): tsc 0, 66/66 tests, next build green, zero stale refs.

## Related

- @wiki/specs/angular-style-file-system (base convention: one-type-per-file + barrels + role suffixes incl. `*.enum.ts`, `*.constants.ts`)
- @wiki/rules/spec-driven-development, @wiki/rules/tdd
- @wiki/memory/domain-driven-barrel-structure (earlier Rust-era barrel pattern)
