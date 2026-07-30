---
title: UI Exported Node References — GDScript @export for Rust Bridge
type: spec
status: approved
tags: [spec, ui, gdext, rust, gdscript]
---

## Overview

Add GDScript to every UI scene/component that the Rust bridge updates, with `@export var` node references replacing the current hardcoded path strings in `get_node_as` calls. Rust reads the exported variables via `slot.get("variable_name")` instead of `slot.get_node_as::<T>("ChildName")`. This decouples the Rust code from the exact tscn hierarchy, allowing UI nodes to be freely rearranged or reparented in the editor without breaking the bridge.

## Locked Decisions

- D1: GDScript on each UI component with `@export var` for nodes Rust needs to reference
- D2: All UI components that Rust touches get a script — both sub-scenes (`card_slot.tscn`) and main scenes (`battle.tscn`, `overworld.tscn`)
- D3: Rust reads exported variables via `slot.get("variable_name")` and converts to the target type
- D4: Exported variable names use snake_case (`name_label`, `effects_label`, etc.)

## Requirements

### Functional Requirements

- FR-1: Each UI component that Rust updates must have a GDScript with `@export var` for every node the Rust bridge references
- FR-2: Rust code must replace `get_node_as::<T>("PathString")` with `self.get("variable_name").try_to::<Gd<T>>()` for UI nodes that have scripts
- FR-3: Non-UI nodes (grid tiles, units, movement overlays) may continue using `get_node_as` with path strings
- FR-4: Dynamically-indexed UI nodes (ManaCrystals/Crystal_{i}, CardSlot_{i}) may keep their path-based parent lookup, but child nodes within them must use the exported variable access

### Components to Script

| Component | File | Exports needed |
|-----------|------|---------------|
| Card slot | `card_slot.tscn` | `name_label`, `cost_label`, `effects_label`, `range_label` (all Label) |
| Battle UI | `battle.tscn` (new script) | `mana_label`, `turn_label`, `end_turn_button`, `result_banner`, `enemy_turn_banner`, `enemy_hand_label`, `replace_button`, `deck_count_button` |
| Card tooltip | `battle.tscn` | `tooltip_panel`, `tooltip_name`, `tooltip_cost`, `tooltip_desc` |
| Enemy card popup | `battle.tscn` | `popup_panel`, `popup_name`, `popup_cost`, `popup_effects` |
| Combat log | `battle.tscn` | `log_panel`, `log_label` |
| Graveyard panel | `battle.tscn` | `gy_panel`, `gy_title`, `gy_close_button`, `gy_player_title`, `gy_enemy_title`, `gy_scroll` |
| Result banner | `battle.tscn` | `banner_panel`, `restart_button`, `return_button` |
| Overworld HUD | `overworld.tscn` (new script) | `hp_label`, `gold_label`, `deck_button`, `map_container` |

### Non-Functional Requirements

- NFR-1: Zero GDScript logic — scripts contain only `@export var` declarations and `@onready var` assignments, no game logic
- NFR-2: Backward compatible — all existing `get_node_as` calls must be migrated; no mixed usage within a single component
- NFR-3: godot-rust `get("name")` returns a `Variant` — must handle the `try_to::<Gd<T>>()` conversion and unwrap appropriately

## Acceptance Criteria

- [ ] AC-1: All card slot labels (name, cost, effects, range) display correctly when accessed via `slot.get("name_label")` instead of `slot.get_node_as::<Label>("NameLabel")`
- [ ] AC-2: Card tooltip shows name, cost, effects, and range on hover, accessed via exported variables
- [ ] AC-3: Enemy card popup shows name, cost, effects on enemy turn, accessed via exported variables
- [ ] AC-4: Combat log shows BBCode-colored entries, accessed via exported variable
- [ ] AC-5: Graveyard viewer opens, scrolls, shows entries, and closes, all via exported variables
- [ ] AC-6: Battle HUD labels (mana, turn, enemy hand) update via exported variables
- [ ] AC-7: All buttons (EndTurn, Restart, Return, Replace, Deck, GYClose) work via exported variables
- [ ] AC-8: Overworld HUD (HP, gold, deck button) updates via exported variables
- [ ] AC-9: Reparenting a node in the editor and re-assigning its `@export var` reference works without Rust changes
- [ ] AC-10: `cargo clippy` passes, `cargo test` passes (151 tests)

## Scenarios

### Scenario 1: Card slot decoupling
**Given** a card slot with `@export var name_label: Label`
**When** Rust calls `slot.get("name_label").try_to::<Gd<Label>>()`
**Then** the returned Label reference is valid and `set_text()` works on it

### Scenario 2: UI redesign without Rust changes
**Given** a designer moves `NameLabel` deeper in the card slot scene tree
**When** the `@export var name_label` is re-assigned in the editor
**Then** Rust continues to work without any code changes

### Scenario 3: Overworld HUD
**Given** the overworld scene with `@export var hp_label: Label`
**When** Rust calls `ui_script.get("hp_label").try_to::<Gd<Label>>()`
**Then** the HP label updates correctly

## Technical Notes

### Rust access pattern

Replace:
```rust
let mut name_label = slot.get_node_as::<Label>("NameLabel");
```

With:
```rust
let name_label: Gd<Label> = slot.get("name_label")
    .try_to::<Gd<Label>>()
    .expect("name_label export missing or wrong type");
```

### What stays as path-based

The following are game-world nodes, not UI — they keep `get_node_as` path access:
- `BattleGrid`, `Tiles`, `MovementOverlay` — grid rendering
- `Units`, `Unit_Hero`, `Unit_Enemy` — unit rendering
- `Body`, `HpBar`, `SelectionRing`, `MovePip`, `AtkPip`, `GlowRing` — unit sub-nodes
- `Camera2D`, `Background` — scene infrastructure