---
title: Enemy Designer UI
type: spec
id: wiki:specs:enemy-designer-ui
status: approved
tags: [enemy, designer, ui, database, spec]
---

## Overview

An in-app enemy designer UI (mirroring CardCreateScreen) that lets developers create and edit enemy templates stored in `enemy-database.json`. Enemy templates define stat blocks, visual identity, deck composition, and metadata — zones reference templates by ID rather than duplicating stats inline.

## Locked Decisions

- D1: **Templates only** — Designer creates individual enemy stat blocks, not full positioned battle lineups. Grid placement remains the zone/battle system's responsibility.
- D2: **Template fields** — name, kind (UnitKind), hp, atk, move, range (Melee/Ranged), goldDrop, isMinion, and an assigned deck.
- D3: **Fixed kind dropdown** — Kind is selected from existing UnitKind enum values (Thug, Enforcer, Boss). No custom kinds.
- D4: **Full migration** — `enemy-database.json` replaces both `enemy-spawns.ts` (demo lineup) and inline zone pool data in `overworld-data.ts`. Zone definitions reference enemy templates by ID.
- D5: **Deck = `{ id, count }` list** — Deck is a list of card references with repetition count. The enemy's exact battle deck is constructed by expanding these entries (shuffled at battle start).

## Requirements

### Functional Requirements

- FR-1: User can create a new enemy template with a slugified unique ID (mirroring card slugify pattern)
- FR-2: User can edit all fields of an existing enemy template
- FR-3: User can edit: name, kind, hp, atk, move, range (Melee/Ranged toggle), goldDrop, isMinion (checkbox), icon, and deck composition
- FR-4: User can select an icon from the same lucide-icon picker used by CardCreateScreen
- FR-5: User can assign a deck by choosing card IDs from CARD_LIBRARY with a count per card
- FR-6: User can save new enemies to `enemy-database.json` via POST /api/enemies
- FR-7: User can save edits to existing enemies via PUT /api/enemies/:id
- FR-8: User can view all saved enemies in a library grid (mirroring CardLibraryScreen)
- FR-9: User can delete enemies from the database
- FR-10: A live preview of the enemy card/stats updates as fields change
- FR-11: `isMinion` marks the enemy as summonable by player cards

### Non-Functional Requirements

- NFR-1: Follows the same UI pattern, layout conventions, and component structure as CardCreateScreen / CardLibraryScreen
- NFR-2: Uses the same dark ocean theme, gold accents, and font-display typography
- NFR-3: Save button is disabled until a name is entered
- NFR-4: Validation prevents saving with empty deck or zero-HP enemies

## Acceptance Criteria

- [ ] AC-1: EnemyCreateScreen renders a form with all template fields and a live preview
- [ ] AC-2: Name, kind, hp, atk, move, range, goldDrop, isMinion are editable
- [ ] AC-3: Icon picker shows same lucide icons as CardCreateScreen
- [ ] AC-4: Deck editor lets user pick card IDs with configurable count per card
- [ ] AC-5: Save writes to `enemy-database.json` via POST /api/enemies
- [ ] AC-6: Editing an existing enemy updates via PUT /api/enemies/:id
- [ ] AC-7: Saved enemies appear in EnemyLibraryScreen grid with edit/delete actions
- [ ] AC-8: Delete removes enemy from database
- [ ] AC-9: Live preview updates as fields change
- [ ] AC-10: Save disabled until name entered
- [ ] AC-11: Empty deck or hp ≤ 0 shows validation message
- [ ] AC-12: Zone definitions accept enemy template IDs
- [ ] AC-13: All existing tests pass after migration

## Scenarios

### Scenario 1: Happy Path — Create a New Enemy
**Given** the user opens the Enemy Designer
**When** they fill in name "Shark Enforcer", kind "Enforcer", hp 8, atk 3, move 2, range "Melee", goldDrop 12, isMinion false, assign a deck with 2x demand_letter
**Then** the enemy saves to `enemy-database.json` with a slugified ID
**Then** the library shows the new enemy in the grid

### Scenario 2: Validate Save Gate
**Given** the user opens the Enemy Designer
**When** no name is entered
**Then** Save button is disabled
**When** name is entered but deck is empty
**Then** a validation message warns "Assign a deck before saving"

### Scenario 3: Edit an Existing Enemy
**Given** the enemy library grid shows saved enemies
**When** the user clicks Edit on "Thug"
**Then** the Enemy Designer opens pre-filled with Thug's stats
**When** the user changes hp from 4 to 6 and clicks Save
**Then** the enemy updates in the database

### Scenario 4: Delete an Enemy
**Given** the enemy library grid shows saved enemies
**When** the user clicks Delete on an enemy
**Then** the enemy is removed from the database and disappears from the grid

### Scenario 5: Migrate Existing Spawns
**Given** `enemy-spawns.ts` has 5 hardcoded entries
**When** migration runs
**Then** all entries move into `enemy-database.json` as templates
**Then** zone `enemyPool` in `overworld-data.ts` references template IDs

## Technical Notes

- Schema: `{ "enemies": [{ id, name, kind, hp, atk, move, range, goldDrop, isMinion, icon, deck: [{ id, count }] }] }`
- Deck is expanded into a flat shuffled list at battle start
- Existing `EnemySpawn` and `EnemySpawnTemplate` interfaces consolidated into a single `EnemyDef` type
- API: POST /api/enemies (create), PUT /api/enemies/:id (update), DELETE /api/enemies/:id
- Zone definitions store `enemyPool: string[]` (template IDs) instead of inline stat objects

## Open Questions

- [x] OQ-1: **(RESOLVED)** Designer supports editing existing enemies, not just create-only.