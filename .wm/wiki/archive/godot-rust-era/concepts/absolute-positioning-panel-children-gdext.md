---
title: Failure: Absolute Positioning in Dynamically-Created Panel Children
type: concept
tags: [failure, godot, ui, gdext, layout]
status: active
edges:
  - {type: references, target: wiki:tasks/crafting-ui-scene-nodes}
---

## What went wrong

When creating card slot UI dynamically in Rust gdext, Labels were positioned inside Panels using `set_position`/`set_size` with absolute coordinates. This caused all text to overlap at the same spot within each slot.

## Root cause

`Panel` in Godot 4 inherits from `Control`, not `Container`. While `Panel` doesn't actively arrange children, dynamically-created Labels inside a Panel that is itself a child of a `GridContainer` can have their absolute positions overridden during the GridContainer's layout pass. The `set_position`/`set_size` calls made before the parent is added to the scene tree don't persist through the container layout.

## Prevention

Use container-based layout (`VBoxContainer` + `HBoxContainer`) instead of absolute positioning for dynamically-created UI elements. Only use `set_position`/`set_size` for static nodes placed in the editor via `.tscn` files.

## Time lost

~15 minutes debugging and rebuilding.

## Related

- @wiki/patterns/container-based-card-slot-layout