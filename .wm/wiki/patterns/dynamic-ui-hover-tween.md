---
title: Pattern: Dynamic UI Hover with Tween
type: pattern
id: wiki:patterns:dynamic-ui-hover-tween
status: reviewed
tags: [pattern, ui, hover, animation]
---

## Problem

How to add a hover "float and expand" effect to dynamically-created UI nodes (cards in a grid, map nodes on an overworld) in a React/JS DOM context. Requires smooth CSS/JS animation, per-node hover detection, and cleanup when the container is repopulated.

## Solution

Three-part approach that works with React and CSS transitions:

1. **Hover detection via mouse position** — Track `hovered: Option<usize>` field. On `InputEventMouseMotion`, compute which child is under the cursor by iterating the container's children and checking `get_rect()` bounds. Never compute the index from hardcoded slot widths/heights — GridContainer cell sizes vary with content.

2. **Tween animation** — On hover change, create a `create_tween()` on the target node:
   ```tsx
   <div
     className={`card-slot ${isHovered ? "hovered" : ""}`}
     style={{
       transform: isHovered ? "scale(1.05) translateY(-10px)" : "scale(1) translateY(0)",
       transition: "transform 0.15s cubic-bezier(0.23, 1, 0.32, 1)",
     }}
   >
   ```
   Save the base Y position when hover starts so the tween can restore it exactly.

3. **Cleanup on repopulate** — Clear the `hovered` field in every function that rebuilds the container (`set_mode`, `on_accept_result`, toggles, close). Stale hover state referencing freed children causes silent failures.

## When to Use

- Adding hover feedback to cards, inventory slots, map nodes, or any dynamically-created UI element
- Grid or list layouts where children are added/removed at runtime

## When Not to Use

- Static UI elements in a `.tscn` — use `mouse_entered`/`mouse_exited` signals instead
- When simple CSS `:hover` transitions suffice (no JS tracking needed)

## Pitfalls

- `Gd<Panel>::try_cast()` returns `Result`, not `Option` — use `.ok()` before `and_then`
- `Control` nodes have no `has_point`; do manual rect bounds check
- Position coordinates differ: `gui_input` gives local coords, `_input` gives viewport coords — convert with `get_global_rect().position` before comparing

## Related

- @wiki/patterns/card-grid-layout