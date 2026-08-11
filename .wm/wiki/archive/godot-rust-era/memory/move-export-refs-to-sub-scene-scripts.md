---
title: Move Export Refs to Sub-Scene Scripts
type: memory
tags: [decision, godot, gdext, scene]
status: active
---

Move @export var node refs from parent scripts into sub-scene scripts when extracting branches. Parent exports only the sub-scene root. Rust uses `get_node_as` with full paths instead of `ui.get("export_name")`. Full reference: @wiki/decisions/move-export-refs-to-sub-scene-scripts