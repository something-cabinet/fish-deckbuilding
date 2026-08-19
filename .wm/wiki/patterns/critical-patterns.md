---
title: critical-patterns
type: pattern
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

## 2026-08-04 React StrictMode double-invoke breaks impure setState updaters (UPDATED 2026-08-13)

**Category:** failure
**Source:** @wiki/tasks/hook-strictmode-render-test--red-green-validated-against-the-command-drain-fix
**Tags:** [react, strictmode, state-management]

NEVER mutate an external queue/session inside a setState updater — React dev StrictMode double-invokes updaters, so the first (discarded) call consumes the side effect and the action silently no-ops (units/movement/mana/cards/HP all frozen, no errors, tests + Node pass).

**Durable fix (2026-08-13, supersedes the earlier workaround):** put history IN the state — pure reducer + HistoryBundle; every updater is a pure function of its argument, so the discarded invocation computes the identical result. The earlier external-drain/stateRef workaround (keep `stateRef.current = state` in sync, drain outside setState via `commit()`) was itself a compensating layer: it fixed the action paths but left undo/redo mutating the session inside updaters — one undo click popped two history entries. See @wiki/patterns/pure-reducer-history-in-state.

Browser-only failures require browser verification — render tests under `<StrictMode>` catch it. Red-baseline tests must cover the bug class: the suite tested move/cast/attack/sell/buy/endTurn but not undo, which is exactly where the second instance of this bug lived. Cost ~1hr (M1) + ~1 session rewrite (M2).

**Full entry:** @wiki/concepts/strictmode-double-invoke-impure-updater · @wiki/patterns/pure-reducer-history-in-state

## 2026-08-13 Layers of stupidity — compensating architecture layers

**Category:** failure
**Source:** @wiki/specs/engine-reducer-rewrite
**Tags:** [architecture, yagni, refactor, anti-pattern]

External review verdict on the engine: "layers of stupidity stacked, each compensating the other." The evidence, all in one codebase: a CommandQueue that never held more than one command (enqueue + drain synchronously per action), a StrictMode workaround that kept the undo double-pop bug alive, trinket fx dropped at 4 call sites, two fx id systems (duplicate engine ids re-stamped by the UI), two effect resolvers, a custom-effect registry with zero handlers, an if/else with identical branches, and `typescript.ignoreBuildErrors: true` masking type errors.

Prevention rule: every abstraction has a consumer (a queue of one is a function call, a registry of zero is a delete); fix the root cause, never patch the patch; one source of truth per concern; the compiler stays on; red-baseline tests cover the bug class. Cost: ~1 session teardown of machinery that never needed to exist.

**Full entry:** @wiki/concepts/layers-of-stupidity-compensating-layers · @wiki/rules/no-compensating-layers · @wiki/patterns/pure-reducer-history-in-state
