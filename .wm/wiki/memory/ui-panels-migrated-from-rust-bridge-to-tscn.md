---
title: UI panels migrated from Rust bridge to tscn
type: memory
tags: [ui, godot-rust, gdext, tscn, migration]
status: active
---

All static UI panels were moved from procedural Rust code (build_ui() in bridge/*.rs) to Godot .tscn scene files. The Rust bridge retains only sync logic (updating labels, toggling visibility, signal connections). Key results:
- ~300 lines of build_ui code removed from battle_scene.rs
- build_ui() in overworld_scene.rs reduced to 3 lines (signal connection only)
- New sub-scenes: hand_container.tscn, graveyard_viewer.tscn
- Unused imports cleaned up in both battle_scene.rs and overworld_scene.rs
- No GDScript added — bridge still drives all UI updates via get_node_as
- Pattern: sub-scenes for self-contained panel groups, direct nodes in battle.tscn for simple elements
- Incremental migration approach (one component at a time) worked well — each step independently verifiable