---
title: Card Type Rework — FaB-Style Action Type
type: spec
tags:
- spec
- cards
- naming
- types
status: approved
---

---
title: Card Type Rework — FaB-Style Action Type
type: spec
tags: [ui, cards, naming, theming]
status: draft
---

## Overview

Rework the card type system to match the Flesh and Blood model where all playable cards are `action` type. The card's combat role (attack/defense) is determined by its numeric stats, not its type label. Currently cards have `attack`/`defense`/`equipment`/`recruit` types — all become `action`.

References: Talishar-FE at `.slim/clonedeps/repos/Talishar-FE/`, specifically `Card.ts` interface and `ParseGameState.ts` type parsing.

## Locked Decisions

- D1: **Action type** — All playable cards are type `action`. Attack/defense values on the card determine combat use, not the type label. Matches FaB model.
- D2: **Scope limited** — Only `action` type for now. Equipment/ally types deferred to later.

## Requirements

### Functional Requirements
- FR-1: `CardDef.type` union changed from `'attack' | 'defense' | 'equipment' | 'recruit'` to `'action'`
- FR-2: All 39 card definitions in `cardData.ts` updated to `type: 'action'`
- FR-3: Card color coding updated — currently each type has a color. `action` cards should still differentiate visually. Suggested: color by keyword/effect category or by cost bracket (cheap/medium/expensive), not by type.
- FR-4: UI filter labels updated — `DeckViewer.svelte` filter dropdown shows `'all' | 'action'` instead of `'all' | 'attack' | 'defense'`
- FR-5: CardTooltip display updated — shows card name, cost, attack/defense, effects, keywords. No "type" label.
- FR-6: All card rendering that switches on `card.type` updated to handle the new single value

### Non-Functional Requirements
- NFR-1: 0 TypeScript errors, 0 svelte-check errors
- NFR-2: 92 tests continue to pass

## Acceptance Criteria

- [ ] AC-1: `CardDef.type` in `CardTypes.ts` is `'action'` union (single value)
- [ ] AC-2: All 39 cards in `cardData.ts` updated to `type: 'action'`
- [ ] AC-3: Color coding system updated — cards no longer colored by type; use cost bracket or keyword-based coloring
- [ ] AC-4: `DeckViewer.svelte` filter updated to show only `action` or removed entirely since there's one type
- [ ] AC-5: `CardTooltip.svelte` no longer shows a "type" label
- [ ] AC-6: All switch/if statements on `card.type` updated or removed
- [ ] AC-7: 92 tests pass, 0 svelte-check errors

## Scenarios

### Scenario 1: Card Display
**Given** a card with `type: 'action'`, attack 3, defense 1, cost 1
**When** the card renders in hand
**Then** it shows the card name, cost, attack (3), defense (1), and effects/keywords
**Then** there is no "type" label (no "action" or "attack" badge)
**Then** the card has a colored border based on its cost or keyword, not its type

### Scenario 2: Deck Viewer Filter
**Given** the player opens the deck viewer
**When** they see the filter dropdown
**Then** it shows only `all` (no type-specific filters since all cards are `action`)

### Scenario 3: Color Coding
**Given** all cards are now `action` type
**When** rendering cards in hand or deck viewer
**Then** cards are visually differentiated by cost bracket (e.g., cost 0-1 green, 2-3 yellow, 4+ red) or by primary keyword, not by type

## Technical Notes

- `CardDef.type` in `CardTypes.ts` changes to a single literal type `'action'`
- For future expansion: keep the union syntax `type: 'action' | 'gear' | 'ally'` so new types can be added later, even though only `action` is active
- Card color: consider `card.color` field which already exists — maybe just keep that per-card color and remove type-based coloring
- The `DeckViewer.svelte` filter (`CardDef['type'] | 'all'`) can be removed or simplified

## Open Questions

- [ ] How to visually differentiate cards without type labels? Options: cost-based coloring, keyword-based coloring, keep per-card `color` field as-is
- [ ] Should `DeckViewer` filter be removed entirely (no filter needed for a single type) or kept as a stub for future types?

## References

- @task-tasks:review-and-rename-card-types-to-thematic-names
- Talishar-FE: `Card.ts` (`.slim/clonedeps/repos/Talishar-FE/src/features/Card.ts`)
- Talishar-FE: `ParseGameState.ts` (FaB type parsing at lines 126-173)