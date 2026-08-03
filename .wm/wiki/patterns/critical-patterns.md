---
---

# Critical Patterns

Promoted learnings from completed work. Read this at the start of every session via `wm-init`. These are lessons that cost the most to learn and save the most by knowing.

---

## 2026-07-30 Snapshot invalidation in gdext bridge

**Category:** failure
**Source:** @task-fix-enemy-reanimation
**Tags:** [gdext, animation, sync]

After every `sync_all()` call, invalidate the animation snapshot (`store_prev_unit_positions()`). A snapshot taken before a mutation will cause phantom re-animations on every subsequent sync if not invalidated. This bug cost ~30min to debug and required adding invalidation at 6 call sites.

**Full entry:** @wiki/concepts/stale-animation-snapshot-gdext

## 2026-07-30 Return-value bridge sync

**Category:** pattern
**Source:** @specs/enemy-card-reveal-graveyard-viewer
**Tags:** [gdext, bridge, architecture]

Core functions should return data the bridge needs (Vec<CardDef>, AttackResult, etc.) rather than making the bridge infer state changes from diffs. This eliminates fragile before/after comparison logic and keeps the bridge as a thin display layer.

**Full entry:** @wiki/patterns/return-value-bridge-sync

## 2026-07-30 gdext UI: tscn over procedural Rust for panels

**Category:** pattern
**Source:** @wiki/specs/ui-panels-to-tscn
**Tags:** [gdext, ui, layout, tscn]

UI panel layout should be defined in `.tscn` scene files, not in Rust `build_ui()` code. The bridge retains sync logic (updating labels, toggling visibility, signal connections). Theme overrides (colors, fonts, StyleBoxFlat) go in the tscn via `theme_override_*` properties. Self-contained panel groups (hand container, graveyard viewer) become sub-scenes instanced into the main scene. This eliminates Rust recompilation for UI tweaks and enables Godot editor visual layout.

**Full entry:** @wiki/specs/ui-panels-to-tscn

## 2026-08-03 WM SDD task-linking gotchas

**Category:** failure
**Source:** @wiki/tasks/restructure-engine-layer-into-domain-folders--barrels-one-typeservicehelper-per-file
**Tags:** [wm, sdd, wiki-tooling]

Three traps when linking spec tasks for SDD validation: (1) new wiki pages are invisible to wm_task.list/get and SDD validation until `wm_index_rebuild` runs; (2) `wm_page.link` writes flow-style YAML edges that the graph/validator IGNORE — only block-style `relates_to:\n- type: implements\n  target: wiki:specs/<name>` in task frontmatter registers; (3) passing `relates_to` to `wm_page.update` on task pages prepends broken `{}` frontmatter blocks and corrupts the file. Fix: create tasks via `wm_task.create` with the spec param, verify with `wm_graph.neighbors`, hand-edit block-style frontmatter if missing, then rebuild the index. Cost ~20min; hits every wm-flow/verify run.

**Full entry:** @wiki/concepts/wm-sdd-task-linking-gotchas
