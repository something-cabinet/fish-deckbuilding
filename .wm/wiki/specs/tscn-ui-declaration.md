---
title: Battle & Overworld UI — Declare in .tscn
type: spec
tags: [godot, ui, tscn, refactor, theming]
---

---
title: Battle & Overworld UI — Declare in .tscn
type: spec
tags: [godot, ui, tscn, refactor, theming]
status: approved
---

## Overview

Extract all runtime UI node creation from the Rust gdext bridge (`build_ui()`) into the Godot `.tscn` scene files. Move battle UI from `rust/src/bridge/battle_scene.rs` (lines 505–760) and overworld HUD from `rust/src/bridge/overworld_scene.rs` (lines 61–100) into `godot/scenes/battle/battle.tscn` and `godot/scenes/overworld/overworld.tscn` respectively. Create a shared Godot Theme `.tres` resource to replace hardcoded colors/styles.

The bridge retains responsibility for **populating** labels, **toggling** visibility, **updating** progress bars, and **creating** truly dynamic children (floating numbers, graveyard viewer entries). It stops **creating** static UI nodes programmatically.

## Locked Decisions

- D1: **Full static UI move** — all panels, labels, buttons, tooltips, scroll containers, and their anchor/layout settings go into .tscn. Only truly dynamic children (floating damage numbers, GY scroll entries) stay in Rust.
- D2: **Shared Theme `.tres`** — Godot Theme resource for base colors, fonts, and StyleBox variants. Dynamic per-card state styling (playability dim, border color, hover lift) stays in Rust via per-frame overrides.
- D3: **Card slot panels kept in Rust** — the 5 CardSlot panels (each with NameLabel, CostLabel, EffectsLabel) continue to be created in a Rust loop (~50 lines). Their parent HandContainer is declared in .tscn.
- D4: **Both scenes** — battle UI and overworld HUD move to .tscn in the same pass.
- D5: **Responsive layout** — every UI node gets proper `anchors_and_offsets_preset` layout settings in .tscn, not hardcoded pixel positions.

## Requirements

### Functional Requirements

- FR-1: `build_ui()` in `battle_scene.rs` creates zero static UI nodes — all such nodes exist in `battle.tscn`
- FR-2: `build_ui()` in `overworld_scene.rs` creates zero static UI nodes — all such nodes exist in `overworld.tscn`
- FR-3: Bridge still populates label text, toggles node visibility, updates progress bars, and manages dynamic children
- FR-4: All existing button signal connections (`connect_other`) continue to work via `get_node_as` paths in .tscn
- FR-5: Shared `theme.tres` defines base colors, fonts, StyleBox variants used by UI nodes in both scenes
- FR-6: Dynamic card-state overrides (can_play border, cannot_play dim, hover lift, targeting glow) remain in Rust
- FR-7: HandContainer is declared in .tscn; its 5 CardSlot children are still created by the Rust loop and parented to it
- FR-8: All UI nodes use anchor/offset layout presets (e.g., TOP_LEFT, TOP_RIGHT) instead of hardcoded pixel positions where appropriate

### Non-Functional Requirements

- NFR-1: Nodes that existed only in the editor before (ManaLabel, TurnLabel, EndTurnButton, ResultBanner) must keep their existing node paths unchanged
- NFR-2: No GDScript added for game logic — scene files are data-only
- NFR-3: Zero visual regression — the rendered layout must look identical to the current runtime-created UI
- NFR-4: UI construction code lines in Rust reduced by at least 200 lines

## Acceptance Criteria

- [ ] AC-1: `battle.tscn` declares all panels, labels, buttons, containers previously created in `build_ui()`: ManaCrystals container, HandContainer, ReplaceButton, DeckCountButton, EnemyHandLabel, GraveyardPanel (with GYTitle, GYCloseButton, GYPlayerTitle, GYEnemyTitle, GYScroll), CardTooltip (with TooltipName, TooltipCost, TooltipDesc), CombatLog (with LogLabel), EnemyCardPopup (with PopupName, PopupCost, PopupEffects), EnemyTurnBanner
- [ ] AC-2: `overworld.tscn` declares Background, HpLabel, GoldLabel, DeckButton, MapContainer
- [ ] AC-3: `build_ui()` removed from `battle_scene.rs`; `ready()` calls `connect_signals()` and `build_grid()` but not `build_ui()`
- [ ] AC-4: Signal connections in `connect_signals()` use the same node paths and remain functional
- [ ] AC-5: Theme `.tres` exists at `godot/themes/battle_theme.tres` with named colors (e.g., `ui_text`, `ui_accent`, `ui_danger`, `grid_light`, `grid_dark`, `card_bg`, `card_border`) and StyleBox variants for panel backgrounds, card slots, buttons
- [ ] AC-6: All hardcoded `rgb()`/`rgba()` color values in `battle_scene.rs`: `build_ui()` are replaced with Theme references or removed (if color was a one-off for a node that now uses .tscn styling)
- [ ] AC-7: HandContainer exists in `battle.tscn` with `position` at (300, 610); CardSlot_0..4 still created by Rust loop and parented to it
- [ ] AC-8: Every UI node has `anchors_and_offsets_preset` set in the .tscn (e.g., ManaLabel = TOP_LEFT, EndTurnButton = TOP_RIGHT, ReplaceButton = BOTTOM_RIGHT, HandContainer = BOTTOM_LEFT)
- [ ] AC-9: `cargo test` still passes (no core changes)
- [ ] AC-10: Battle UI renders identically to pre-refactor when running `godot --path godot/ scenes/battle/battle.tscn`
- [ ] AC-11: Overworld HUD renders identically when transitioning from battle or starting fresh
- [ ] AC-12: Line count of UI construction code (`build_ui` + helpers) in Rust bridge reduced by ≥200 lines

## Scenarios

### Scenario 1: Battle Loads
**Given** the user starts a battle from the overworld
**When** `battle.tscn` instantiates
**Then** all UI nodes (mana crystals, hand area, graveyard panel, tooltip, combat log, end turn button, replace button, enemy hand label, enemy turn banner, enemy card popup) exist at their expected paths
**Then** the Rust bridge discovers them via `get_node_as` and populates them
**Then** the battle plays identically to the pre-refactor version

### Scenario 2: Card Unplayability
**Given** the player has 1 mana and a card costing 3
**When** the hand is synced
**Then** the card slot shows dimmed opacity (current behavior via `slot.set_modulate`)
**Then** the card slot shows a dimmed border style
**Then** the card tooltip still shows full details on hover

### Scenario 3: Overworld Navigation
**Given** the player returns from a battle
**When** the overworld scene loads
**Then** HpLabel shows current HP, GoldLabel shows gold, DeckButton is clickable
**Then** MapContainer renders zone map nodes

### Scenario 4: Theme Change
**Given** a Theme `.tres` file with `ui_accent = #ff0000`
**When** the battle scene loads
**Then** accent-colored UI elements (EndTurnButton text, mana label accent) use the theme color
**Then** no Rust code recompilation is needed to change the color

## Technical Notes

- Node paths in .tscn must match exactly what `connect_signals()` and sync methods expect (e.g., `"UI/ManaLabel"`, `"UI/EndTurnButton"`, `"UI/GraveyardPanel/GYCloseButton"`, `"BattleGrid/MovementOverlay"`, `"Units"`)
- CardSlot parenting: `sync_hand_ref()` currently does `self.base().get_node_as::<CanvasLayer>("UI").get_node_as::<Node2D>("HandContainer")` — this path must remain valid after the move
- The `build_ui()` method also calls `set_anchors_and_offsets_preset`, `set_focus_mode`, `set_custom_minimum_size` on scene-defined nodes (EndTurnButton, ManaLabel, etc.) — these settings belong in .tscn, not in Rust
- Template approach for CardSlots: keep the Rust loop, parent to the HandContainer declared in .tscn. A `card_slot.tscn` sub-scene is optional future work — not required for this spec
- Theme `.tres` creation: use Godot editor to create `godot/themes/battle_theme.tres` with named colors and StyleBoxFlat resources. Reference it in `project.godot` as the default theme
- Overworld's `build_ui()` creates Background, HpLabel, GoldLabel, DeckButton, MapContainer — all of these go into `overworld.tscn`
- Overworld `MapContainer` stays empty in .tscn — the Rust loop `draw_nodes()` and `draw_connections()` dynamically populate it. Only the container node itself moves to .tscn

## Open Questions

- [ ] Should `card_slot.tscn` be created as a separate scene later for editor-previewable card design? (Out of scope — tracked separately.)

## Related

- @wiki/specs/godot-battle-scaffold — current implementation baseline
- @wiki:core:architecture — file structure, bridge pattern
- @wiki:core:critical-patterns — snapshot sync (unimplemented) and untested orchestration lessons
- @wiki:tasks:godot-theme-resource-system-for-consistent-ui-styling — theme task (overlaps with D2)
