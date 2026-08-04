---
title: Angular-Style File System — One Service/Helper/Interface per File
type: spec
tags:
- convention
- file-organization
- typescript
- refactor
- barrel
- spec
- approved
status: approved
---

## Overview

Restructure the engine, hooks, and shared lib layers of the Next.js/React codebase (`src/lib/game/`, `src/lib/utils.ts`, `src/hooks/`) around an Angular-style file system: one top-level service/helper/interface per file, organized into domain folders with barrel `index.ts` re-exports. This replaces the current flat, mixed files (`types.ts` packs 15 top-level decls; `engine.ts` mixes reducers + helpers) and the stale Rust-era docs that describe a retired stack.

Components (`src/components/`) are already one-component-per-file and are excluded from this restructure.

## Locked Decisions

- D1: **Scope** — Engine (`src/lib/game/`) + hooks (`src/hooks/`) + shared lib (`src/lib/utils.ts`) adopt the convention. Components stay as-is.
- D2: **Naming** — Angular role suffixes: `*.service.ts`, `*.interface.ts`, `*.model.ts`, `*.enum.ts`, `*.helper.ts`.
- D3: **Granularity** — Strictly one top-level type per file. Domain = folder + barrel `index.ts`; consumers import from the barrel, never individual files.
- D4: **Migration** — Retroactive refactor now: split existing files, update all imports and tests in the same pass. Green tests + build are the gate.
- D5: **Docs** — Update stale CONVENTIONS.md, ARCHITECTURE.md, DESIGN.md to describe the real Next.js/React stack and the new convention.

## Requirements

### Functional Requirements

- FR-1: Every domain under `src/lib/game/` lives in its own folder with a barrel `index.ts` re-exporting all public items.
- FR-2: Each top-level type (interface/type alias/enum) gets its own file with the role suffix (D2, D3).
- FR-3: Services (engine reducers, history, resolver, commands) are split into per-domain `*.service.ts` files, one responsibility per file.
- FR-4: Helpers (icons, utils, schema glue) live in `*.helper.ts` files.
- FR-5: Consumers import from domain barrels only — no imports of individual files inside `src/lib/game/` from outside it.
- FR-6: `src/hooks/use-fish-mafia.ts` and `src/lib/utils.ts` adopt the naming/barrel convention where they expose multiple concerns.
- FR-7: All existing imports and test imports across `src/` are updated in the same pass (D4).
- FR-8: CONVENTIONS.md, ARCHITECTURE.md, DESIGN.md updated to reflect the real stack and this convention (D5).

### Non-Functional Requirements

- NFR-1: Zero behavior change — this is a pure structural refactor; no runtime semantics, card data, or engine logic altered.
- NFR-2: Full test suite green after the refactor (currently 92 tests via `npm test` / vitest).
- NFR-3: `npm run build` green.
- NFR-4: No new circular imports (existing type-only `fish-mafia-app` ↔ `fish-mafia-game` cycle must not grow; barrel layer must not reintroduce runtime cycles).
- NFR-5: Barrels stay mechanical — `index.ts` contains re-exports only, no logic.

## Acceptance Criteria

- [ ] AC-1: `src/lib/game/types.ts` no longer exists; every top-level type from it lives in its own suffixed file within a domain folder.
- [ ] AC-2: Domain folders each have an `index.ts` barrel; no code outside the domain imports an individual file inside it.
- [ ] AC-3: `engine.ts`, `commands.ts`, `effects.ts`, `history.ts` are split into per-domain `*.service.ts` files with no mixed responsibilities.
- [ ] AC-4: `icons.ts`, `utils.ts`, and any schema glue conform to the `*.helper.ts` / barrel convention.
- [ ] AC-5: `npm test` passes (92 tests, parity with pre-refactor suite — no tests removed or weakened).
- [ ] AC-6: `npm run build` passes.
- [ ] AC-7: No new circular imports introduced (grep-verifiable; type-only cycles documented if they remain).
- [ ] AC-8: CONVENTIONS.md describes the actual Next.js/React stack and the one-per-file + barrel convention as the standard.
- [ ] AC-9: ARCHITECTURE.md stack section matches the real repo (Next.js 16 + React 19 + Tailwind v4; no retired Godot/Rust pivot text as current state).
- [ ] AC-10: DESIGN.md component map updated to the real `src/` layout and current app shell topology.

## Scenarios

### Scenario 1: Happy Path — New Type Added
**Given** a domain folder `cards/` with barrel `index.ts`
**When** a developer adds a new card type
**Then** they create one suffixed file (e.g. `card-slot.interface.ts`), re-export it from the barrel, and consumers import it from the barrel unchanged.

### Scenario 2: Consumer Looks Up a Type
**Given** the old `types.ts` is gone
**When** a component needs `GameState`
**Then** it imports from the domain barrel (e.g. `@/lib/game/battle`), not a deep path, and the barrel resolves it.

### Scenario 3: Edge Case — Discriminated Union
**Given** `CardEffect` is a union of 7 kinds (one logical top-level type)
**When** splitting types
**Then** the union stays together in a single `card-effect.model.ts` — the rule is one *top-level type* per file, not one variant per file.

### Scenario 4: Regression Gate
**Given** the refactor is complete
**When** `npm test` and `npm run build` run
**Then** all 92 tests pass and the build is green, proving zero behavior change (NFR-1..3).

## Technical Notes

Target sketch (planning may refine):

```
src/lib/game/
  cards/            # CardDef, CardType, CardTarget, CardEffect, card library data
    card-def.interface.ts
    card-type.model.ts
    card-target.model.ts
    card-effect.model.ts      # the 7-kind union stays together (Scenario 3)
    card-instance.interface.ts
    pack-01-starter.json      # data stays in place; loader reads it
    schema.ts                 # zod schema glue → schema.helper.ts if split
    index.ts
  units/            # Unit, UnitKind, Team
    unit.interface.ts
    unit-kind.model.ts
    team.model.ts
    index.ts
  battle/           # GameState, FxEvent, Phase, Pos, board constants
    game-state.interface.ts
    fx-event.interface.ts
    phase.model.ts
    pos.interface.ts
    board.constants.ts        # COLS/ROWS (or *.enum.ts per naming rule)
    index.ts
  services/         # per-domain services (one responsibility each)
    engine.service.ts
    commands.service.ts
    effects.service.ts
    history.service.ts
    index.ts
  helpers/
    icons.helper.ts
    index.ts
```

- Constants placement (COLS/ROWS) is a planning-time detail — either `*.constants.ts` or folded into the relevant model file per D2/D3.
- `data.ts` (CARD_LIBRARY, STARTER_DECK, ENEMY_SPAWNS) maps to a `*.data.ts` or stays as the cards-domain data module — planner's call, must obey the barrel rule.
- The known type-only `fish-mafia-game` ↔ `fish-mafia-app` import cycle should be resolved or explicitly documented (NFR-4).
- Tests in `src/lib/game/__tests__/` import engine internals; they are part of the same-pass import update (FR-7).

## Open Questions

- [ ] Should `COLS`/`ROWS` and similar pure constants use a dedicated `*.constants.ts` suffix (extension to D2), or fold into the nearest model file?
- [ ] Where should the zod `schema.ts` live once types split — as `schema.helper.ts` in the cards domain, or a shared `helpers/`?