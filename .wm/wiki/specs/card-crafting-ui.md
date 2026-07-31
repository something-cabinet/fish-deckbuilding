---
title: Card Crafting UI
type: spec
tags:
- spec
- crafting
- ui
- enchanter
- gambler
- corrupt
status: approved
---

## Overview

Shared crafting panel for Enchanter (add slot), Gambler (reroll affix), and Corrupt operations. Replaces the current debug-print placeholder (`overworld_scene.rs:231-249`) with a full UI allowing card selection, operation choice, and result display. All three modes share a single panel container with mode-specific controls.

Builds on the existing Rust backend (`affix.rs`, `model.rs`) which already implements all three operations. The spec covers only the Godot UI layer.

## Locked Decisions

- D1: **Shared panel with three modes** — Enchanter (add slot), Gambler (reroll affix), Corrupt are tabs within one `CraftingPanel`. Not separate NPCs or standalone screens.
- D2: **Random affix for reroll** — In Gambler mode, the reroll picks a random affix from the card. The player does not choose which affix to reroll.
- D3: **Grid layout for card browser** — Combat deck cards displayed in a 2-3 column grid of small card panels showing name, cost, rarity, and affix summary.
- D4: **Side-by-side before/after comparison** — After a crafting operation, the result is shown alongside the original card with an Accept button to confirm.
- D5: **Stash toggle** — Card browser has a button to switch between combat deck and stash view.
- D6: **Seed hidden** — Deterministic RNG seed is not visible to the player.
- D7: **Confirm step for all operations** — Enchanter, Gambler, and Corrupt all show a confirmation prompt before executing.

## Requirements

### Functional Requirements

- FR-1: Crafting panel opens when clicking Enchanter, Gambler, or Corrupt map node, with the corresponding mode active
- FR-2: Panel has a mode selector (tabs or buttons) to switch between Enchanter/Gambler/Corrupt
- FR-3: Panel shows current gold balance and the cost of the selected operation
- FR-4: Panel shows the player's cards in a scrollable grid (2-3 columns), defaulting to combat deck
- FR-5: A toggle button switches between combat deck view and stash view
- FR-6: Each card in the grid shows: name, cost badge, rarity color, affix count, corrupted badge
- FR-7: Ineligible cards are grayed out with a tooltip reason:
  - Max affixes reached (Enchanter) — card already at `Rarity::max_affixes()`
  - No affixes to reroll (Gambler) — card has zero affixes
  - Already corrupted (any mode) — corrupted cards cannot be modified further
- FR-8: Clicking a card in the grid opens the card detail view showing: full name, cost, effects, all affixes with values, implicit affix (if corrupted), corrupted red border
- FR-9: **Enchanter mode** — Action button "Add Slot" (cost shown). Disabled if card has max affixes or is corrupted.
- FR-10: **Gambler mode** — "Reroll" button picks a random affix from the card and replaces it with a new one. Disabled if no affixes or card is corrupted.
- FR-11: **Corrupt mode** — "Corrupt" button with warning text about risk. Disabled if card is already corrupted.
- FR-12: All three operations show a confirmation prompt before executing, with the cost and a brief description of the action
- FR-13: After operation, result display shows the original card (left) and modified card (right) side-by-side with an "Accept" button
- FR-14: Accepting the result applies the change to `RunState`, updates gold, and keeps the panel open for further crafting
- FR-15: Close button (X) closes the panel and returns to the overworld map
- FR-16: Corrupt results show the outcome name (e.g., "Boost!", "Bricked...", "Implicit Added!") with color-coded feedback
- FR-17: Result panel shows the corruption-only implicit affix (if outcome added one) in a distinct visual style

### Non-Functional Requirements

- NFR-1: Panel follows the same dark theme as existing UI (`#0b1a24` bg, `#4fd1c5` accent)
- NFR-2: All UI nodes defined directly in `overworld.tscn` (no sub-scenes — gdext compatibility)
- NFR-3: Rust bridge (`overworld_scene.rs`) syncs all UI state via `get_node_as` — no GDScript additions
- NFR-4: Panel toggles visibility (shown/hidden) — does not change scene
- NFR-5: Close button restores overworld map interaction

## Acceptance Criteria

- [ ] AC-1: Clicking Enchanter/Gambler/Corrupt map node opens crafting panel in the correct mode
- [ ] AC-2: Mode tabs switch between Enchanter, Gambler, and Corrupt without closing the panel
- [ ] AC-3: Gold balance and operation cost are displayed and update after each operation
- [ ] AC-4: Cards render in a scrollable grid with name, cost, rarity, affix count
- [ ] AC-5: Toggle button switches between combat deck and stash view
- [ ] AC-6: Ineligible cards are grayed out with a reason tooltip
- [ ] AC-7: Clicking a card opens the detail view showing full card info and affixes
- [ ] AC-8: Enchanter mode: clicking "Add Slot" adds a random affix, deducts gold
- [ ] AC-9: Gambler mode: clicking "Reroll" replaces a random affix, deducts gold
- [ ] AC-10: Corrupt mode: clicking "Corrupt" shows a confirmation, then applies corruption, deducts gold
- [ ] AC-11: Confirmation prompt appears for all three operations before executing
- [ ] AC-12: Result display shows before/after side-by-side with Accept button
- [ ] AC-13: Accepting applies the change to RunState and updates the card browser
- [ ] AC-14: Close button returns to the overworld map with no side effects
- [ ] AC-15: Corrupt result shows the outcome name with color coding
- [ ] AC-16: Corrupted cards show a red border and "Corrupted" badge in the card browser and detail view
- [ ] AC-17: Implicit affixes display in a distinct style (e.g., purple text, separate section)

## Scenarios

### Scenario 1: Enchanter — Add Slot to Rare Card
**Given** the player has a Rare card with 1 affix in their combat deck, and 100+ gold
**When** they click the Enchanter node on the map
**Then** the crafting panel opens in Enchanter mode
**When** they click the Rare card in the grid
**Then** the card detail shows the card with its 1 affix
**When** they click "Add Slot"
**Then** a confirmation prompt shows the cost and action
**When** they confirm
**Then** a new random affix appears on the card, gold decreases by 100
**Then** the result shows the card before (1 affix) and after (2 affixes) side-by-side
**When** they click Accept
**Then** the card is updated in the combat deck, the card browser refreshes

### Scenario 2: Gambler — Reroll Affix
**Given** the player has a Rare card with 2 affixes in their combat deck, and 50+ gold
**When** they click the Gambler node
**Then** the panel opens in Gambler mode
**When** they click the card and click "Reroll"
**Then** a confirmation prompt shows the cost and that a random affix will be rerolled
**When** they confirm
**Then** one random affix is replaced with a new one, gold decreases by 50
**Then** the result shows the before/after card side-by-side

### Scenario 3: Corrupt — Boost Outcome
**Given** the player has a Rare card with "+3 ATK" and "+4 Shield" affixes, and 200+ gold
**When** they click the Corrupt tab, select the card, and click "Corrupt"
**Then** a confirmation prompt warns about the risk
**When** they confirm
**Then** the "Boost!" outcome triggers: affix values increase by 30%
**Then** the card gains a red border and "Corrupted" badge
**Then** the result shows the outcome name in green, before/after side-by-side

### Scenario 4: Corrupt — Brick Outcome
**Given** the player corrupts a card
**When** the "Weaken" outcome triggers
**Then** the result shows "Bricked..." in red, affix values decreased
**Then** the card is marked as corrupted, cannot be crafted further

### Scenario 5: Ineligible Card
**Given** the player has a Common card with 0 affixes (max affixes = 0)
**When** they open the Enchanter panel
**Then** the Common card is grayed out in the grid
**When** they hover over it
**Then** a tooltip says "Cannot add slot — card already at max affixes (0)"

### Scenario 6: Corrupt Confirmation
**Given** the player has selected a card in Corrupt mode
**When** they click "Corrupt"
**Then** a confirmation dialog appears: "This will permanently corrupt this card. The result is random and cannot be undone. Continue?"
**When** they click Cancel
**Then** the panel returns to the previous state, no changes applied

### Scenario 7: Browse Stash
**Given** the player has cards in both the combat deck and stash
**When** they open the crafting panel
**Then** the card browser shows the combat deck
**When** they click the "Stash" toggle button
**Then** the browser refreshes to show stash cards instead
**When** they click a stash card
**Then** the card detail view shows the selected stash card
**When** they click the "Deck" toggle button
**Then** the browser returns to the combat deck view

## Technical Notes

### Panel structure in overworld.tscn

All nodes placed directly under the existing `UI` CanvasLayer (no sub-scenes):

```
UI/CraftingPanel (Panel, hidden by default)
├── CraftingPanel/Header
│   ├── Header/Title (Label)
│   ├── Header/GoldDisplay (Label, "Gold: 150")
│   └── Header/CloseButton (Button, "X")
├── CraftingPanel/ModeTabs (HBoxContainer)
│   ├── ModeTabs/EnchanterTab (Button, "Enchanter")
│   ├── ModeTabs/GamblerTab (Button, "Gambler")
│   └── ModeTabs/CorruptTab (Button, "Corrupt")
├── CraftingPanel/CardBrowser (ScrollContainer)
│   ├── CardBrowser/DeckStashToggle (HBoxContainer)
│   │   ├── DeckStashToggle/DeckButton (Button, "Deck", toggled by default)
│   │   └── DeckStashToggle/StashButton (Button, "Stash")
│   └── CardBrowser/Grid (GridContainer, 3 columns)
│       └── CardSlot_* (Panel, populated dynamically)
├── CraftingPanel/CardDetail (Panel, shown on card click)
│   ├── CardDetail/NameLabel
│   ├── CardDetail/CostLabel
│   ├── CardDetail/EffectsLabel
│   ├── CardDetail/AffixList (VBoxContainer)
│   │   ├── AffixList/Affix_0 (Label)
│   │   ├── AffixList/Affix_1
│   │   ├── AffixList/Affix_2
│   │   └── AffixList/Affix_3
│   ├── CardDetail/ImplicitAffix (Label, hidden if none)
│   └── CardDetail/CorruptedBanner (Label, "CORRUPTED", red)
├── CraftingPanel/ActionSection
│   ├── ActionSection/CostLabel (Label, "Cost: 100g")
│   ├── ActionSection/WarningLabel (Label, hidden, for corrupt warning)
│   └── ActionSection/ActionButton (Button, text changes per mode)
├── CraftingPanel/ResultSection (Panel, hidden, shown after operation)
│   ├── ResultSection/OutcomeLabel (Label, "Boost!", colored)
│   ├── ResultSection/BeforeCard (Panel, original card)
│   ├── ResultSection/AfterCard (Panel, modified card)
│   └── ResultSection/AcceptButton (Button, "Accept")
└── CraftingPanel/ConfirmDialog (Panel, hidden)
    ├── ConfirmDialog/Message (Label, action description + cost)
    ├── ConfirmDialog/ConfirmButton (Button)
    └── ConfirmDialog/CancelButton (Button)
```

### Rust bridge integration

- `overworld_scene.rs` gains a `CraftingMode` enum (`Enchanter`, `Gambler`, `Corrupt`)
- `open_crafting(mode)` populates the card browser from `run.combat_deck`, shows the panel
- `sync_crafting_ui()` updates all labels, affix lists, and button states
- `on_card_click(idx)` selects a card, populates the detail view
- `on_action()` shows the confirmation dialog
- `on_confirm()` calls the appropriate `RunState` method, shows the result
- `on_confirm()` calls the appropriate `RunState` method, shows the result
- `on_accept()` applies the result to RunState, refreshes the browser
- `on_close()` hides the panel, re-enables map interaction
- `on_toggle_deck_stash()` switches between combat deck and stash card sources
- Mode tabs switch visibility of action/affix controls

### Node path conventions

- `UI/CraftingPanel` — root panel
- `UI/CraftingPanel/CardBrowser/Grid/CardSlot_{idx}` — card entries
- `UI/CraftingPanel/CardDetail/AffixList/Affix_{idx}` — affix click targets
- `UI/CraftingPanel/ActionSection/ActionButton` — mode-specific action
- `UI/CraftingPanel/ResultSection/BeforeCard` / `AfterCard` — result display
- `UI/CraftingPanel/ConfirmDialog` — confirmation prompt

### Existing Rust API

| Operation | RunState method | Cost | Signature |
|-----------|----------------|------|-----------|
| Add slot | `enchanter_add_slot(deck_idx, seed)` | 100g | `(usize, u64) -> Option<&CardDef>` |
| Reroll affix | `gambler_reroll_affix(deck_idx, seed)` | 50g | `(usize, u64) -> Option<&CardDef>` |
| Corrupt | `corrupt_card(deck_idx, seed)` | 200g | `(usize, u64) -> Option<&CardDef>` |

## Open Questions

None — all resolved.