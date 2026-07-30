---
title: Enemy Card Reveal Animation & Graveyard Viewer
type: spec
status: implemented
tags:
- game-design
- ui
- combat
- cards
- animation
---

## Overview

Make enemy card plays visible to the player through a card reveal animation on screen, and allow both sides to inspect recently played cards via a graveyard viewer panel. Without this, enemy card plays are invisible — the player sees only a generic log line and the resulting HP/shield changes, which makes the game feel opaque and unfair.

## Locked Decisions

- D1: **Enemy card reveal uses the existing card slot UI** — Same Panel/Label layout as player hand cards, positioned center-screen briefly during the enemy turn
- D2: **Graveyard viewer is a toggle-overlay panel** — Opens as a scrollable list on the right side of the battle UI, showing both player and enemy graveyards side-by-side
- D3: **Cards in graveyard are displayed and interactive** — Clicking a graveyard card shows its full tooltip (same hover tooltip used for player hand)
- D4: **No card back / hidden information** — Both graveyards are fully visible. Enemy hand is hidden (not in scope) but played cards are public information

## Requirements

### Functional Requirements

- FR-1: When the enemy plays a card during its turn, a card panel appears center-screen showing the card name, cost, and effects
- FR-2: The enemy card reveal animates in (scale 0→1, fade), holds for ~1.2s, then animates out
- FR-3: If the enemy plays multiple cards, they are queued and shown one at a time (sequential, not stacked)
- FR-4: The deck count label area is extended to include a graveyard count for both sides
- FR-5: Clicking the graveyard count or a dedicated "Graveyard" button opens the graveyard viewer overlay
- FR-6: The graveyard viewer shows both player and enemy graveyards in two columns
- FR-7: Each graveyard entry shows card name, cost, and effects (same layout as hand cards, compact)
- FR-8: Clicking a card in the graveyard viewer shows its full tooltip (reuses CardTooltip panel)
- FR-9: The graveyard viewer is closeable via an "X" button or clicking outside the panel
- FR-10: The graveyard viewer is also accessible during the player's turn (not just enemy turn)
- FR-11: Cards already in the graveyard at battle start (none) are displayed; as cards are played, the graveyard updates immediately

### Non-Functional Requirements

- NFR-1: Enemy card animation does not block player input — player can still interact during enemy turn? Actually no — the enemy turn already blocks input via `animating` flag. The card animation fits within that block.
- NFR-2: Graveyard viewer must not overlap the hand container or grid
- NFR-3: Total graveyard viewer memory: at most ~30 cards × ~150 bytes per CardDef = negligible

## Acceptance Criteria

- [ ] AC-1: Enemy card reveal shows correct card name, cost, and effects
- [ ] AC-2: Multiple cards play sequentially with individual animations
- [ ] AC-3: Graveyard viewer opens and shows both player and enemy graveyards
- [ ] AC-4: Graveyard viewer closes on "X" click or outside click
- [ ] AC-5: Clicking a graveyard card shows the card tooltip
- [ ] AC-6: Graveyard updates immediately after each card play
- [ ] AC-7: Deck count label shows graveyard size for both sides
- [ ] AC-8: Animation fits within the enemy turn pacing (no additional delay)

## Scenarios

### Scenario 1: Enemy plays a card
**Given** the enemy has Coral Shell (2 cost, Shield(6)) in hand
**When** the enemy turn begins
**Then** the enemy plays Coral Shell
**Then** a card panel appears center-screen showing "Coral Shell", cost "2", and "6 shield"
**Then** the panel animates in over 0.2s, holds for 1.0s, animates out over 0.2s
**Then** the player's hero gains 6 shield (visual + state)
**Then** the combat log shows "Enemy plays Coral Shell (6 shield)"

### Scenario 2: Player inspects graveyard
**Given** the enemy has played Coral Shell and the player has played Fin Slash
**When** the player clicks the "Graveyard" button during their turn
**Then** a panel opens on the right side showing:
  - "Player Graveyard: 1 card" — Fin Slash (1 cost, 3 dmg)
  - "Enemy Graveyard: 1 card" — Coral Shell (2 cost, 6 shield)
**When** the player clicks on Coral Shell
**Then** the card tooltip appears showing full details
**When** the player clicks the "X" button
**Then** the graveyard viewer closes

### Scenario 3: No cards in graveyard
**Given** no cards have been played
**When** the player opens the graveyard viewer
**Then** both columns show "Empty"
**Then** the deck count label shows "GY: 0 | 0"

## Open Questions

- [ ] **OQ-1**: ~~Should the graveyard viewer be a toggle or a hover-expand from the deck count label?~~ **RESOLVED**: Toggle — clicking the deck count label or a dedicated button opens/closes the panel.
- [ ] **OQ-2**: ~~Should the enemy card reveal animation position be fixed center-screen or floating near the enemy unit?~~ **RESOLVED**: Fixed center-screen at approximately (490, 300), larger than hand cards.
- [ ] **OQ-3**: ~~Should cards in the graveyard be sorted by play order (most recent first)?~~ **RESOLVED**: Yes — most recently played card appears at the top.

## Implementation Notes

### Enemy card reveal (bridge layer, battle_scene.rs)
- `run_enemy_turn()` already has `played_cards: Vec<CardDef>` from `play_enemy_cards_sync()`
- Create a method `animate_enemy_card_play(card: &CardDef, index: usize)` that:
  1. Creates or reuses a center-screen card panel node
  2. Sets name/cost/effects labels from card data
  3. Runs scale tween (0→1, 0.2s), holds 1.0s, runs opacity tween (1→0, 0.2s)
  4. Sequences via tween callbacks for multiple cards
- Reuse existing card slot styling (matching CardSlot_0/1/2/3/4 panels)
- Position: Center of screen at approximately (490, 300), larger than hand cards

### Graveyard viewer (bridge layer, battle_scene.rs)
- New UI panel built in `build_ui()`:
  ```
  GraveyardPanel (Panel, hidden by default)
  ├── TitleBar (Node2D)
  │   ├── TitleLabel ("Graveyard")
  │   └── CloseButton (Button, "X")
  ├── PlayerColumn (Node2D)
  │   ├── HeaderLabel ("Hero Graveyard")
  │   └── CardEntries (dynamic, populated at sync time)
  └── EnemyColumn (Node2D)
      ├── HeaderLabel ("Enemy Graveyard")
      └── CardEntries (dynamic, populated at sync time)
  ```
- `sync_gy_viewer()` method populates card entries from `state.graveyard` and `state.enemy_graveyard`
- Card entries: compact version of card slot (120×90, smaller font, name + cost + effects)
- Tooltip on click: reuse existing `show_card_tooltip` adaptation for graveyard cards
- Position: right side at x=850, width=400, spans from y=50 to y=580

### Deck count label update
- Already exists at (1060, 660) showing deck count
- Extend to: `Deck: 12 | GY: 3 | 1` (deck count, player GY, enemy GY)
- Make clickable to open graveyard viewer

### Core logic (no changes needed)
- `Graveyard` struct already has `cards: Vec<CardDef>`, `add()`, `len()`
- `play_enemy_cards` already returns `Vec<CardDef>`
- Both `state.graveyard` and `state.enemy_graveyard` are accessible from bridge