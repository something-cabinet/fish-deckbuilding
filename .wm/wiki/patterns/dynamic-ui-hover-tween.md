---
title: Pattern: Dynamic UI Hover with Tween (gdext)
type: pattern
id: wiki:patterns:dynamic-ui-hover-tween
status: reviewed
tags: [pattern, gdext, ui, hover, tween]
---

## Problem

How to add a hover "float and expand" effect to dynamically-created UI nodes (cards in a grid, map nodes on an overworld) in a Rust gdext bridge. Requires smooth tween animation, per-node hover detection, and cleanup when the container is repopulated.

## Solution

Three-part approach that works with gdext 0.5 and Godot 4.x:

1. **Hover detection via mouse position** — Track `hovered: Option<usize>` field. On `InputEventMouseMotion`, compute which child is under the cursor by iterating the container's children and checking `get_rect()` bounds. Never compute the index from hardcoded slot widths/heights — GridContainer cell sizes vary with content.

2. **Tween animation** — On hover change, create a `create_tween()` on the target node:
   ```rust
   let mut tween = slot.create_tween();
   tween.set_trans(TransitionType::QUINT);
   tween.set_ease(EaseType::OUT);
   tween.set_parallel();
   tween.tween_property(&slot, "scale", &Vector2::new(1.05, 1.05).to_variant(), 0.15);
   tween.tween_property(&slot, "position", &Vector2::new(x, base_y - 10.0).to_variant(), 0.15);
   ```
   Save the base Y position when hover starts so the tween can restore it exactly.

3. **Cleanup on repopulate** — Clear the `hovered` field in every function that rebuilds the container (`set_mode`, `on_accept_result`, toggles, close). Stale hover state referencing freed children causes silent failures.

## When to Use

- Adding hover feedback to cards, inventory slots, map nodes, or any dynamically-created UI element
- Grid or list layouts where children are added/removed at runtime

## When Not to Use

- Static UI elements in a `.tscn` — use `mouse_entered`/`mouse_exited` signals instead
- When `gui_input` per-child signals are simpler (children are few and static)

## Pitfalls

- `Gd<Panel>::try_cast()` returns `Result`, not `Option` — use `.ok()` before `and_then`
- `Control` nodes have no `has_point`; do manual rect bounds check
- Position coordinates differ: `gui_input` gives local coords, `_input` gives viewport coords — convert with `get_global_rect().position` before comparing

## Related

- @wiki/tasks/crafting-ui-bridge-plumbing