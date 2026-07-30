---
{}
relates_to:
  - {type: references, target: wiki:specs:ui-panels-to-tscn}
---

---
{}
relates_to:
  - {type: references, target: wiki:decisions:move-export-refs-to-sub-scene-scripts}
---

---
{}
relates_to:
  - {type: extends, target: wiki:patterns:incremental-ui-to-tscn}
---

---
title: Pattern: Scene Branch Extraction
type: pattern
id: wiki:patterns:scene-branch-extraction
tags: [pattern, godot, scene, refactor, gdext]
---

## Problem

A Godot scene has grown too large — hundreds of lines in the `.tscn` file, dozens of `@export var` references in the parent script, making the scene hard to navigate, edit, or reuse. Individual node groups are tightly coupled to the parent scene and cannot be tested or previewed independently.

## Solution

Extract self-contained node branches into their own `.tscn` files with their own GDScript scripts. Each sub-scene owns its internal node references via `@export var`. The parent only exports a reference to the sub-scene root.

### Step-by-step

1. **Identify a self-contained branch** — a node + its children that form a logical unit (tooltip, popup, panel group, etc.)
2. **Right-click → Save Branch as Scene** in the editor, or create the `.tscn` manually
3. **Create a script for the sub-scene** that declares `@export var` for each internal node that needs to be accessed:
   ```gdscript
   # card_tooltip.gd
   extends Panel
   @export var name_label: Label
   @export var cost_label: Label
   @export var desc_label: Label
   ```
4. **Wire the NodePaths** in the sub-scene's `.tscn` file — Godot editor handles this automatically when you drag nodes
5. **Update the parent script** — replace the individual `@export` references with a single export for the sub-scene root:
   ```gdscript
   # battle_ui.gd
   extends CanvasLayer
   @export var card_tooltip: Panel  # was: tooltip_panel, tooltip_name, tooltip_cost, tooltip_desc
   ```
6. **Update Rust/gdext bridge code** — change from `ui.get("internal_node_name")` to `self.base().get_node_as::<T>("Parent/SubScene/InternalNode")`:
   ```rust
   // Before (via parent script @export)
   let name_label: Gd<Label> = ui.get("tooltip_name").try_to().expect("tooltip_name missing");
   
   // After (direct path through sub-scene)
   let name_label = self.base().get_node_as::<Label>("UI/CardTooltip/TooltipName");
   ```
7. **Move sub-resources** (StyleBoxFlat, etc.) into the sub-scene's `.tscn` — each sub-scene is fully self-contained
8. **Verify** — the extracted sub-scene renders identically to the inline version

### Sub-scene script pattern

Sub-scene scripts should be minimal:
- `@export var` declarations for all internal nodes that Rust/GDScript code needs to access
- Optional convenience methods (e.g., `show_card(name, cost, desc)`) for GDScript-driven usage
- NO game logic — that stays in the Rust bridge

### Rust bridge access pattern

Full paths from the scene root resolve correctly through sub-scene boundaries:
```rust
self.base().get_node_as::<Panel>("UI/SubSceneName")
self.base().get_node_as::<Label>("UI/SubSceneName/ChildName")
```

This works because Godot's node path resolution treats instanced scenes as transparent — the path traverses into the sub-scene's internal tree automatically.

## When to Use

- Scene has >15 nodes or the `.tscn` file exceeds ~150 lines
- Parent script has too many `@export var` references (10+ pointing to children of the same sub-tree)
- A node group is duplicated across multiple scenes (reuse motivation)
- A node group needs independent testing or previewing in the editor
- Rust bridge code uses `ui.get("export_name")` for many children of the same sub-tree

## When Not to Use

- The sub-tree has only 1-2 nodes and is used in only one place
- The sub-tree is fully dynamic (created/deleted procedurally at runtime)
- Extracting would create more coupling than it removes (e.g., requires excessive signal wiring)

## Related
- @wiki/patterns:incremental-ui-to-tscn (parent pattern — UI from Rust to tscn)
- @wiki/specs:ui-panels-to-tscn
- @wiki/decisions:move-export-refs-to-sub-scene-scripts