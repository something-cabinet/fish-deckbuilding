---
title: ui-panels-to-tscn
type: spec
status: superseded
---

## Overview

Move static UI panel layout definitions from Rust procedural code (`build_ui()` in `bridge/battle_scene.rs` and `bridge/overworld_scene.rs`) to Godot `.tscn` scene files. The Rust bridge remains responsible for *syncing* UI state (updating labels, toggling visibility, populating dynamic entries). Grid tiles and unit rendering stay procedural in Rust.

## Motivation

- Godot's scene editor is vastly better for layout iteration than Rust pixel-pushing
- UI tweaks currently require a full Rust recompile — moving to tscn enables instant visual feedback
- The bridge layer is supposed to be "thin" — 300+ lines of `build_ui()` contradicts that
- Separates *structure* (tscn) from *behavior* (Rust bridge), matching Godot's intended workflow

## Locked Decisions

- D1: All UI panels (hand container, graveyard viewer, combat log, mana crystals, enemy card popup, card tooltip, enemy turn banner, and overworld HUD) move to tscn; grid tiles, movement overlays, and unit rendering stay procedural in Rust
- D2: Bridge-driven sync — Rust continues to update UI via `get_node_as` on the tscn-defined tree; no GDScript added
- D3: Incremental migration — one component at a time, not a single monolithic rewrite

## Requirements

### Functional Requirements

- FR-1: All panels currently created in `build_ui()` (battle_scene.rs:505–813) and `build_ui()` (overworld_scene.rs:61–100) must be defined in their respective `.tscn` files instead
- FR-2: The Rust bridge must still be able to reference every UI node by its path string after the move
- FR-3: All existing sync methods (`sync_ui_ref`, `sync_hand_ref`, `sync_gy_viewer`, `sync_mana_crystals`, `sync_visuals_ref`) must continue to work unchanged
- FR-4: All existing signal connections (`connect_signals`) must continue to work unchanged
- FR-5: All existing tweens and animations referencing UI nodes must continue to work unchanged
- FR-6: The `build_ui()` method in Rust must be deleted (or reduced to a no-op) after all components are migrated

### Components to Migrate (in order)

1. **Hand container** — 5 CardSlot panels with nested NameLabel, CostLabel, EffectsLabel
2. **Mana crystals** — 10 crystal panels under ManaCrystals node
3. **Combat log** — Panel + RichTextLabel
4. **Card tooltip** — Panel with TooltipName, TooltipCost, TooltipDesc
5. **Enemy card popup** — Panel with PopupName, PopupCost, PopupEffects
6. **Enemy turn banner** — Label
7. **Graveyard viewer** — Panel with GYTitle, GYCloseButton, GYScroll, GYPlayerTitle, GYEnemyTitle
8. **Replace button + Deck count button** — Buttons
9. **Overworld HUD** — Background, CanvasLayer, MapContainer, HpLabel, GoldLabel, DeckButton

### Non-Functional Requirements

- NFR-1: The `battle.tscn` file size should remain reasonable — no single monolithic file
- NFR-2: Each component should be independently verifiable before moving to the next
- NFR-3: No regression in existing functionality between incremental steps

## Acceptance Criteria

- [ ] AC-1: With `build_ui()` removed/deleted, the battle scene renders identically to the current procedural version
- [ ] AC-2: All hand card slots display name, cost, and effects correctly
- [ ] AC-3: Mana crystals light up/dim correctly on turn start and card play
- [ ] AC-4: Combat log shows BBCode-colored entries and scrolls
- [ ] AC-5: Card tooltip shows on hover and hides on unhover
- [ ] AC-6: Enemy card popup animates and auto-hides
- [ ] AC-7: Enemy turn banner fades in/out
- [ ] AC-8: Graveyard viewer opens, scrolls, shows player/enemy columns, and closes
- [ ] AC-9: Overworld scene renders background, map nodes, connections, hero icon, and HUD labels
- [ ] AC-10: All existing button signals (EndTurn, Restart, Return, Replace, Deck, GYClose) work after migration

## Scenarios

### Scenario 1: Hand container migration
**Given** the battle scene loads
**When** the hand cards are synced
**Then** the 5 card slots appear at the same position/size/style as before, with name, cost badge, and effects description

### Scenario 2: Graveyard viewer migration
**Given** the player clicks the deck count button
**When** the graveyard panel opens
**Then** it shows player and enemy graveyard entries in a scrollable panel with the same styling as before

### Scenario 3: Overworld HUD migration
**Given** the overworld scene loads
**When** the run state is restored
**Then** HP and Gold labels display current values, Deck button is clickable, and the map renders correctly

## Technical Notes

### Sub-scene limitation with godot-rust gdext

Sub-scenes (`instance=ExtResource(...)`) do NOT work with godot-rust gdext — `get_node_as` cannot find children of instanced scenes during `ready()`. All UI nodes must be defined directly in the main scene file. This overrides the earlier decision to use sub-scenes.

### Migration pattern per component

1. Define the node tree in the `.tscn` file (using Godot editor or direct tscn editing)
2. Remove the corresponding node creation code from the Rust `build_ui()` method
3. Verify the Rust bridge can still find all nodes by path (existing `get_node_as` calls should work as long as paths match)
4. Run the game and verify visual parity

### Path consistency

The existing Rust code references nodes by path strings like `"UI/HandContainer/CardSlot_0"`, `"UI/ManaCrystals/Crystal_0"`, `"UI/CombatLog/LogLabel"`, etc. The tscn definitions must use matching node names and parent-child hierarchy so that no bridge code changes are needed.

### The `build_ui` method

Should be stripped incrementally. After each component, the corresponding block in `build_ui()` is removed. After all migrations, `build_ui()` becomes a no-op and can be deleted entirely.

### Overworld scene

The `overworld.tscn` currently has only a Camera2D node. The overworld's `build_ui()` creates Background, UI CanvasLayer, and MapContainer dynamically. The map nodes themselves (connections, node circles, hero icon) are drawn procedurally each frame — those stay in Rust. Only the static panel structure (Background, CanvasLayer, MapContainer, HpLabel, GoldLabel, DeckButton) moves to tscn.

## Open Questions

- [x] Should the hand container use a single sub-scene (`hand_container.tscn`) instanced into `battle.tscn`, or should all nodes live directly in `battle.tscn`?
  → **Sub-scenes.** Hand container, graveyard viewer, and any other self-contained panel group get their own `.tscn` instanced into `battle.tscn`.