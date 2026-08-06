---
title: Card Database Persistence
type: spec
tags:
- spec
- approved
- cards
- persistence
- dev-tool
relates_to:
  - {type: relates_to, target: wiki:tasks:import-card-databasejson-into-cardlibrary-and-wire-save-button}
---

## Overview

Persistence for the dev-only card design tool. Cards created via the card creator UI are saved to `card-database.json` in the project source tree via a Next.js API route. The file is imported at module load into `CARD_LIBRARY`, making cards available both in dev (for testing) and in production (for players).

## Locked Decisions

- **D1** — Storage mechanism: Dev API route writing to `card-database.json`
- **D2** — File location: `src/lib/game/cards/card-database.json`
- **D3** — Auth: Unauthenticated, dev-only (excluded from production build)
- **D4** — Write strategy: Upsert by card `id` (same id = update, new id = append)
- **D5** — Loading: Import `card-database.json` at module load into `CARD_LIBRARY`
- **D6** — Git: Tracked in git (ships to players)

## Requirements

### Functional Requirements

- **FR-1**: Card creator "Save to Library" button writes the card to `card-database.json` via a POST API route
- **FR-2**: API upserts by card `id` — existing id updates the entry, new id appends
- **FR-3**: `card-database.json` is imported in `card-library.ts` alongside existing static packs
- **FR-4**: `CARD_LIBRARY` includes all cards from `card-database.json`
- **FR-5**: Library screen shows the saved card immediately via React state (instant feedback, no reload needed)
- **FR-6**: On page reload, saved cards persist in the library via the module import
- **FR-7**: API route is only available in dev mode, not mounted in production build
- **FR-8**: File is created automatically on first write if it doesn't exist

### Non-Functional Requirements

- **NFR-1**: File format matches the existing pack format: `{ "cards": CardDef[] }` — validated by `CardPackSchema`
- **NFR-2**: Same zod validation applied as existing packs (malformed data throws at module load)

## Acceptance Criteria

- [ ] **AC-1**: Creating a card with a name and clicking "Save to Library" persists the card to `card-database.json`
- [ ] **AC-2**: Saving a card with an existing `id` updates the entry in the file (no duplicates)
- [ ] **AC-3**: On page reload, saved cards appear in the library alongside built-in cards
- [ ] **AC-4**: `card-database.json` is validated against `CardPackSchema` on import
- [ ] **AC-5**: API route returns 404 when the app is built for production
- [ ] **AC-6**: Card appears in the library immediately after save without a page reload

## Scenarios

### Scenario 1: Create and save a new card
**Given** the user is on the card creator screen
**When** they fill in name, type, cost, etc. and click "Save to Library"
**Then** the card appears in the library immediately
**And** `card-database.json` contains the new entry with the generated `id`

### Scenario 2: Edit an existing custom card
**Given** a previously saved custom card exists in `card-database.json`
**When** the user saves a card with the same `id`
**Then** the file is updated with the new data (entry replaced, not duplicated)

### Scenario 3: Production build
**Given** the project is built for production (`next build`)
**When** the game loads in a browser
**Then** cards from `card-database.json` are available in `CARD_LIBRARY`
**And** the `POST /api/cards` route is not mounted (returns 404)

### Scenario 4: First save — file doesn't exist yet
**Given** no `card-database.json` exists
**When** the user saves their first card
**Then** the file is created with `{ "cards": [ ... ] }` containing the card

## Technical Notes

### File format
```json
{ "cards": [ /* CardDef[] */ ] }
```
Identical structure to existing pack files (`pack-01-starter.json`), validated by `CardPackSchema`.

### API route
- **Endpoint**: `POST /api/cards`
- **Body**: Single `CardDef` object
- **Behavior**: Read file → upsert by `id` → write file
- **Runtime**: Node.js (`fs` module), not edge
- **Dev guard**: Route file lives in `src/app/api/cards/route.ts` — standard Next.js App Router

### Import in card-library.ts
```typescript
import userCards from "../card-database.json"

const cardPacks = [pack01]
const userPacks = [userCards]
const allPacks = [...cardPacks, ...userPacks]
```

### Instant feedback
The existing `customCards: CardDef[]` React state in `FishMafiaApp` is kept as-is for immediate UI feedback. The API write happens in the background — no need to wait for it to update the view.

### Custom card effects
Cards created via the creator currently set `effects: []` and `log: ""` / `logTone: "neutral"` (display-only). This is left unchanged — designing card effects/log copy is a future concern.

## Open Questions

None — all architectural decisions locked.