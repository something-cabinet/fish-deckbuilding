---
title: Incremental UI Migration from Rust Bridge to tscn
type: pattern
tags:
- pattern
- ui
- gdext
- tscn
- godot-rust
status: draft
relates_to:
  - {type: references, target: wiki:specs:ui-panels-to-tscn}
---

## Problem

A godot-rust project has accumulated hundreds of lines of procedural UI code in `build_ui()` methods within the gdext bridge layer. Tweaking a panel position or color requires a full Rust recompile. The bridge layer is supposed to be "thin" but is bloated with pixel-pushing code.

## Solution

Migrate static UI panel layout from Rust to `.tscn` scene files using an incremental, component-by-component approach:

1. **Identify self-contained panel groups** — elements like hand containers, graveyard viewers, tooltips, popups that form a logical unit
2. **Create sub-scenes** for self-contained groups (`hand_container.tscn`, `graveyard_viewer.tscn`), with the root node matching the original node name and position
3. **Add simple elements directly** to the main scene file (`battle.tscn`, `overworld.tscn`) for single nodes like buttons, labels, and mana crystals
4. **Set theme overrides in the tscn** — font colors, sizes, autowrap modes, and StyleBoxFlat resources go in the scene file via `theme_override_*` properties and `[sub_resource]` definitions
5. **Remove the corresponding Rust code block** from `build_ui()` after each component
6. **Keep sync code unchanged** — the bridge still references nodes by path (`get_node_as`), and those paths must match the tscn hierarchy
7. **Verify visually** after each component — run the game and check visual parity

## When to Use

- Existing godot-rust project with procedural UI in `build_ui()` methods
- UI layout is static (positions, sizes, colors) with dynamic content (labels, visibility)
- Team wants to use Godot's visual editor for layout iteration

## When Not to Use

- UI is fully dynamic (procedurally generated at runtime)
- The bridge is genuinely thin already (fewer than ~50 lines of UI creation)
- Editor tooling is not available (e.g. CI-only development)

## Key Details

### Path consistency is critical
The Rust bridge references nodes by path strings like `"UI/HandContainer/CardSlot_0"`. The tscn hierarchy must match exactly — same node names, parent-child relationships, and case sensitivity.

### godot-rust sub-scene limitation
Sub-scene instances (`instance=ExtResource("1")`) do NOT work reliably with godot-rust gdext — `get_node_as` cannot find children of instanced scenes during `ready()`. All UI nodes must be defined **directly** in the main scene file, not in sub-scenes. This was discovered at runtime when `get_node_as::<Panel>("CardSlot_0")` panicked on an instanced sub-scene child. Inlining the nodes into `battle.tscn` resolved the issue.

### Sub-resources for styles
Inline `StyleBoxFlat` resources use the `[sub_resource]` format in tscn:
```gdscript
[sub_resource type="StyleBoxFlat" id="StyleBoxFlat_log"]
bg_color = Color(0.043, 0.102, 0.141, 0.85)
corner_radius_top_left = 6
```

### Incremental verification
Each component is independently verifiable before moving to the next. This reduces risk and makes debugging easier.

## Related
- @wiki/specs/ui-panels-to-tscn
- @wiki/memory/ui-panels-migrated-from-rust-bridge-to-tscn
- @wiki/decisions:rust-gdext-bridge-over-gdscript