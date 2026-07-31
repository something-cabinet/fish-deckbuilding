---
title: Pattern: Container-Based Layout for Dynamically-Created Card Slots in gdext
type: pattern
tags: [pattern, godot, ui, gdext, layout]
status: active
edges:
  - {type: references, target: wiki:tasks/crafting-ui-scene-nodes}
  - {type: answers, target: wiki:specs/card-crafting-ui}
---

## Problem

When dynamically creating card slot UI in a Rust gdext bridge, using `set_position`/`set_size` on Labels within a `Panel` causes text overlap and layout issues. The Panel's children don't respect absolute positioning reliably when the Panel is managed by a `GridContainer`.

## Solution

Use container-based layout instead of absolute positioning. Each card slot is a `Panel` (for the styled background) containing a `VBoxContainer` that arranges child Labels. Use `HBoxContainer` for side-by-side elements (cost + affix count).

```rust
let mut slot = Panel::new_alloc();
slot.set_custom_minimum_size(Vector2::new(180.0, 70.0));
slot.add_theme_stylebox_override("panel", &style.upcast::<StyleBox>());

let mut vbox = VBoxContainer::new_alloc();
vbox.add_theme_constant_override("separation", 2);

let mut name_label = Label::new_alloc();
name_label.set_text(card.name);
vbox.add_child(&name_label);

let mut row = HBoxContainer::new_alloc();
let mut cost = Label::new_alloc();
cost.set_text(&format!("{}g", card.cost));
row.add_child(&cost);
let mut affix = Label::new_alloc();
affix.set_text(&format!("{} affix", card.affixes.len()));
row.add_child(&affix);
vbox.add_child(&row);

slot.add_child(&vbox);
grid.add_child(&slot);
```

## When to Use

- Dynamically creating card slots, inventory items, or list entries via Rust gdext
- Any UI where children are added to a Container-managed parent (GridContainer, VBoxContainer, etc.)
- When the contents per slot vary (some have corrupted labels, ineligibility reasons, etc.)

## When Not to Use

- Static UI defined in `.tscn` files — absolute positioning in the editor is fine
- Nodes with a single child — `MarginContainer` or `PanelContainer` is simpler
- When precise pixel-perfect positioning is required across all resolutions

## Related

- @wiki/specs/card-crafting-ui
- @wiki/tasks/crafting-ui-scene-nodes