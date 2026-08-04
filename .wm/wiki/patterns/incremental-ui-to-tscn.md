---
title: Incremental UI Migration from Rust Bridge to tscn
type: pattern
tags: [pattern, ui, gdext, tscn, godot-rust]
status: draft
relates_to:
  - {type: references, target: wiki:specs:ui-panels-to-tscn}
---

---
title: Incremental UI Migration from Rust Bridge to tscn
type: pattern
status: draft
tags: [pattern, ui, gdext, tscn, godot-rust]
when_to_use: godot-rust projects with procedural UI in build_ui methods that want Godot visual editor layout iteration
example: Extract hand_container.tscn sub-scene with its own GDScript; keep full-path get_node_as calls in the Rust bridge
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

### Sub-scenes DO work with godot-rust (full paths required)

Sub-scene instances (`instance=ExtResource("1")`) DO work with godot-rust gdext — but only when using **full absolute paths from the scene root**:
```rust
// ✅ Works — full path from scene root resolves through sub-scene boundaries
self.base().get_node_as::<Label>("UI/CardTooltip/TooltipName");

// ❌ Fails — relative path on a parent node cannot see through sub-scene instances
hand_container.get_node_as::<Panel>("CardSlot_0");
```

The earlier finding that "sub-scenes don't work" was caused by using relative `get_node_as` calls on parent nodes. Full paths from `self.base()` (scene root) correctly traverse into instanced sub-scenes. This was validated with 6 extracted sub-scenes (result_banner, card_tooltip, combat_log, graveyard_panel, enemy_card_popup, mana_crystals).

### Sub-scene scripts own their @export references

When extracting a sub-scene, give it its own GDScript with `@export var` declarations for internal node references. The parent script only exports a reference to the sub-scene root:

```gdscript
# card_tooltip.gd — sub-scene script owns internal refs
extends Panel
@export var name_label: Label
@export var cost_label: Label
@export var desc_label: Label
```

```gdscript
# battle_ui.gd — parent only references the sub-scene root
extends CanvasLayer
@export var card_tooltip: Panel
```

Rust code accesses sub-scene internals via full paths from the scene root:
```rust
self.base().get_node_as::<Label>("UI/CardTooltip/TooltipName");
```

### Sub-resources for styles
Inline `StyleBoxFlat` resources use the `[sub_resource]` format in tscn:
```gdscript
[sub_resource type="StyleBoxFlat" id="StyleBoxFlat_log"]
bg_color = Color(0.043, 0.102, 0.141, 0.85)
corner_radius_top_left = 6
```

Move sub-resources into the sub-scene `.tscn` file alongside the nodes that use them, keeping each sub-scene fully self-contained.

### Incremental verification
Each component is independently verifiable before moving to the next. This reduces risk and makes debugging easier.

## Related
- @wiki/patterns/scene-branch-extraction
- @wiki/patterns/shared-singletons-vs-gdscript-export
