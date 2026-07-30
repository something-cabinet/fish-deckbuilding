---
title: Critical Patterns
type: core
tags: [critical]
---

# Critical Patterns

Promoted learnings from completed work. Read this at the start of every session via `wm-init`. These are lessons that cost the most to learn and save the most by knowing.

---

## 2026-07-27 — Test the UI Orchestration Layer, Not Just Pure Functions

**Category:** failure
**Source:** @wiki/concepts:untested-ui-orchestration-p0s
**Tags:** [testing, ui, orchestration]

All P0 bugs across BOTH architectures (roguelite and tactical RPG) lived in the untested UI wiring layer. The pure function layer had 0 bugs across 194 tests. Root cause: no integration tests for the orchestrator code that connects game logic to UI. The project's own NFR-2 was written to prevent this, but the orchestrator test suite was deleted during cleanup and not rebuilt — causing the same failure pattern to recur.

**What to do differently:** Write integration tests that script a full battle cycle (draw → play → defend → victory/death). Test the orchestration, not just the leaf functions. NEVER delete orchestrator tests without replacement. UI components should be thin — call tested controllers.

**Full entry:** @wiki/concepts/untested-ui-orchestration-p0s

---

## 2026-07-27 — Always Split Roguelite State into Run + Combat

**Category:** pattern
**Source:** @wiki/patterns:run-combat-state-split
**Tags:** [state, architecture, roguelite]

RunState persists across battles (deck, HP, gold, relics). CombatState is per-battle (hand, draw pile, turn phase). Copy the run deck into a battle deck at combat start — never modify the run deck during combat. Discard battle deck on exit.

**What to do differently:** Enforce this split from day 1. The initial flat GameState caused deck corruption. The split fixed it.

**Full entry:** @wiki/patterns/run-combat-state-split

---

## 2026-07-27 — Snapshot-Based State Sync Prevents ECS Desyncs

**Category:** pattern
**Source:** @wiki/patterns:snapshot-state-sync
**Tags:** [ecs, state, sync, event-driven]

In event-driven ECS architectures, per-field granular events (card:played → sync coins, enemy:hurt → sync HP) inevitably produce desyncs — 5 P0 bugs in this project were caused by this pattern. Switching to a single `state:changed` snapshot event after every action eliminated all of them.

**What to do differently:** Emit a full state snapshot after every action, not per-field events. The bridge/subscriber does a bulk sync from the snapshot. Keep granular events only for transient UI effects (flashes, animations).

**Full entry:** @wiki/patterns/snapshot-state-sync

---

## 2026-07-28 — Browser Game Storage: localStorage, Not Prisma/SQLite

**Category:** decision
**Source:** @wiki/decisions/browser-localstorage-persistence
**Tags:** [persistence, database, architecture]

Prisma + SQLite with better-sqlite3 imports Node native modules that cannot compile or run in a Vite browser bundle. The build only passes because tree-shaking drops the unreferenced module. For single-player browser game state (<100KB), localStorage is the correct choice — synchronous, always available, no build tooling.

**What to do differently:** Choose localStorage for client-side game persistence from the start. Reserve Prisma/SQLite for server-side tooling (admin panels, data analysis) where Node native modules are available.

**Full entry:** @wiki/decisions/browser-localstorage-persistence

---

## 2026-07-28 — GDExtension Scene Node Type Must Match the Custom Class, Not a GDScript Wrapper

**Category:** failure
**Source:** @wiki/concepts:gdext-scene-node-type-mismatch
**Tags:** [godot, gdext, scene-setup]

A `.tscn` node using a Rust GodotClass must declare `type="<CustomClass>"` directly. Declaring `type="Node2D"` with a GDScript stub (`extends <CustomClass>`) attached via `script=` fails in Godot 4.7 with "Script inherits from native type 'X', so it can't be assigned to an object of type: 'Y'" — a script can only add behavior on top of a node's actual type, it can't narrow a built-in node into a registered subclass. The symptom is misleading: zero errors in the Output panel, extension loads fine, no class-name collisions — it only shows in Debugger > Errors when the scene actually runs (F5).

**What to do differently:** When a GDExtension class provides all the node's behavior via `#[godot_api] impl INode2D` (or similar), give it its own `.tscn` node with `type="<CustomClassName>"` and skip the GDScript wrapper entirely. If this error appears, check the `.tscn` node's `type=` before suspecting the extension build, dll path, or editor cache.

**Full entry:** @wiki/concepts/gdext-scene-node-type-mismatch

---

## 2026-07-29 — GDExtension Click Input: Use `_input()` Not `_unhandled_input()` with CanvasLayer UI

**Category:** failure
**Source:** @wiki/concepts:gdext-bridge-pattern
**Tags:** [godot, gdext, input, architecture]

Mouse clicks on a GDExtension bridge scene with CanvasLayer UI never reach `_unhandled_input()` because Control nodes in the CanvasLayer process input in `_gui_input` AFTER `_input` fires but BEFORE `_unhandled_input`. Debugging this cost 30+ minutes of instrumentation (adding input counters, mouse_filter on every visual node, switching between `_input` and `_unhandled_input`). The root cause was using the wrong virtual method.

**What to do differently:** For grid/tactical game scenes that need to catch clicks before UI consumes them, override `_input()` (maps to Godot's `_input`) instead of `_unhandled_input()`. `_input()` fires before `_gui_input` on Control nodes, so CanvasLayer UI cannot consume the event first. Do NOT try to fix this by setting `mouse_filter = IGNORE` on every visual node — you'll miss one.

**Full entry:** @wiki/concepts/gdext-bridge-pattern#input-handling-use-_input-over-_unhandled_input-for-gdextension-bridge-scenes-with-canvaslayer-ui

---

## 2026-07-30 — RUSTFLAGS Env Overrides .cargo/config.toml in CI

**Category:** failure
**Source:** @wiki/concepts:rustflags-env-overrides-config-toml
**Tags:** [rust, ci, build, emscripten, gdext]

The `actions-rust-lang/setup-rust-toolchain@v1` action exports `RUSTFLAGS=-D warnings` into the job environment. `RUSTFLAGS` env has highest Cargo precedence — when set, Cargo completely ignores `target.*.rustflags` from `.cargo/config.toml`. The threaded wasm build worked because it set `RUSTFLAGS` explicitly (duplicating config flags), but the nothreads build omitted it — inheriting only `-D warnings`, losing `-sSIDE_MODULE=2`, `-Z emscripten-wasm-eh=false`, etc. The artifact would have been structurally broken, silently, with no error.

**What to do differently:** Build scripts that rely on `.cargo/config.toml` rustflags must be self-contained. Extract shared flags into a variable and set `RUSTFLAGS` explicitly for **every** cargo invocation, not just the first one. Consider adding `rustflags: ''` to `setup-rust-toolchain` to prevent it from setting `RUSTFLAGS` if you manage flags through config.toml.

**Full entry:** @wiki/concepts/rustflags-env-overrides-config-toml

---

## 2026-07-30 — Valid Targets Single Source of Truth Prevents UI/Logic Drift

**Category:** pattern
**Source:** @wiki/patterns:valid-targets-single-source-of-truth
**Tags:** [testing, ui, orchestration, pattern]

One `valid_targets()` function in the pure core is called by the bridge overlay, click validation, AI, and engine. The same code determines which tiles are valid and validates the player's click. No drift between "what the UI shows" and "what the engine accepts" — the exact failure mode behind every P0 in this project's history. The three-layer bridge deadlock (2026-07-30 repeat of the untested orchestration pattern) was fixed by this architecture.

**What to do differently:** Any time a UI action requires validation, put the validation logic in a pure core function that both the overlay renderer and the action handler call. Never let the bridge implement its own targeting/rules logic. Integration-test the full click path (select → move → attack) through the bridge's own test helpers.

**Full entry:** @wiki/patterns/valid-targets-single-source-of-truth

---

## 2026-07-31 — Scene Branch Extraction: Sub-Scene Scripts Own Their @export Refs

**Category:** pattern
**Source:** @wiki/patterns:scene-branch-extraction
**Tags:** [godot, scene, refactor, gdext]

When a scene grows too large, extract self-contained node branches into their own `.tscn` files with their own GDScript. The sub-scene's script owns its internal `@export var` node references. The parent only exports a reference to the sub-scene root. Rust bridge code accesses sub-scene internals via `self.base().get_node_as::<T>("Parent/SubScene/Child")` — full paths resolve correctly through sub-scene boundaries.

**What to do differently:** Extract any node branch with 3+ children and its own visual identity into a sub-scene. Give the sub-scene a script that owns its internal node refs. Update Rust code to use full paths from the scene root instead of `ui.get("export_name")`. This keeps scenes manageable (<150 lines per tscn) and decouples the Rust bridge from GDScript property names.

**Full entry:** @wiki/patterns/scene-branch-extraction