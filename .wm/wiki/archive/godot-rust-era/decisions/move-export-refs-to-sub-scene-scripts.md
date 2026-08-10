---
{}
relates_to:
  - {type: implements, target: wiki:patterns:scene-branch-extraction}
---

---
title: Decision: Move @export Refs from Parent to Sub-Scene Scripts
type: decision
id: wiki:decisions:move-export-refs-to-sub-scene-scripts
status: approved
tags: [decision, godot, gdext, scene, refactor]
---

## Context

The `battle_ui.gd` script had 26 `@export var` declarations — all internal node references for children of the UI CanvasLayer. The `battle.tscn` file was 419 lines with deeply nested inline node definitions. The Rust bridge accessed these nodes via `ui.get("export_name")`, tightly coupling the bridge to the GDScript property names.

## Decision

Move all `@export var` references for internal sub-scene nodes from the parent script (`battle_ui.gd`) into the sub-scene's own script. The parent script only exports a reference to the sub-scene root. Rust code accesses sub-scene internals via `self.base().get_node_as::<T>("Parent/SubScene/Child")` full paths.

## Rationale

- **Self-containment** — each sub-scene is a complete, independently testable unit. Its script owns its node references, so opening the sub-scene in the editor shows all its exports.
- **Reduced coupling** — the parent script no longer needs to know about internal nodes of its children. Changing a sub-scene's internal structure doesn't require updating the parent's exports.
- **Cleaner Rust bridge** — using full paths (`get_node_as`) instead of `ui.get("export_name")` decouples the Rust code from GDScript property names. The paths are stable as long as the scene hierarchy is stable.
- **Future-proofing** — sub-scenes can be replaced entirely (e.g., swapping a GDScript-driven tooltip for a more complex one) without changing the parent or the Rust bridge.

## Consequences

- **Positive:** `battle_ui.gd` went from 26 exports to 13. `battle.tscn` went from 419 lines to ~145 lines.
- **Positive:** Each sub-scene can be opened and edited independently in the Godot editor.
- **Positive:** Rust code now uses stable node paths instead of GDScript property names.
- **Neutral:** Rust code needs `self.base().get_node_as::<T>("Full/Path")` which is slightly more verbose than `ui.get("name")` but more explicit.
- **Negative (mitigated):** Requires updating Rust code when sub-scene paths change. Mitigated by using `get_node_as` with expect messages for clear panics.

## Related
- @wiki/patterns:scene-branch-extraction
- @wiki/patterns:incremental-ui-to-tscn