---
title: Save/Load — Godot ConfigFile/Resource Persistence
type: spec
id: wiki:specs:save-load-persistence
status: draft
tags: [godot, persistence, save, rust, gdext]
---

---
title: Save/Load — Godot ConfigFile/Resource Persistence
type: spec
status: draft
tags: [godot, persistence, save, rust, gdext]
---

## Overview

Replace the old browser-localStorage save concept with Godot's native persistence (JSON files under `user://`). Full save/load of RunState: gold, HP, card collection, combat deck, stash, current node, unlocked zones, defeated bosses. Auto-save on critical transitions, manual Continue/New Run from menu.

This spec formalizes the save/load integration points referenced in `wiki:specs:post-battle-progression-flow` (FR-21–FR-24). The old Prisma/Node/browser persistence code paths are fully removed.

## Locked Decisions

- D1: **JSON via serde** — RunState serialized to JSON using serde + serde_json. Human-readable, debuggable, extensible.
- D2: **Godot FileAccess** — Files written/read via Godot's `FileAccess` (gdext bridge), stored in `user://` directory (persists across restarts, platform-independent).
- D3: **Single-slot Phase 1** — One save slot (`user://save_0.json`). Multi-slot deferred to Phase 2.
- D4: **Auto-save** — Save triggered automatically on: node transition, battle end (victory/defeat), shop purchase, crafting operation. No auto-save timer.
- D5: **Manual load** — Menu shows "Continue" (if save exists) or "New Run". No auto-load.

## Requirements

### Functional Requirements

- FR-1: Save file `user://save_0.json` contains:
  - `run_state` — gold, hp, max_hp, current_node_id, unlocked_zone_ids, defeated_boss_ids, completed_node_ids, turn_count, run_seed
  - `card_collection` — Vec of serialized CardDef (all cards owned)
  - `combat_deck_indices` — 10 indices into card_collection (max 10)
  - `stash_indices` — remaining indices for stash (max 30 total including combat_deck)
  - `enemy_defeated_counts` — per-zone enemy kill counts (for progression tracking)
  - `metadata` — version, timestamp, playtime_seconds
- FR-2: Save triggers (auto-save):
  - After every node transition in the overworld
  - After battle victory (reward screen shown)
  - After battle defeat (return to overworld)
  - After shop purchase
  - After crafting operation (reroll, add slot, corrupt)
  - After deck management change
  - On manual save (if user requests)
- FR-3: Load flow: on game boot → menu scene → check `user://save_0.json` exists → show "Continue" button
  - "Continue": deserialize JSON → restore RunState → jump to overworld at current_node
  - "New Run": generate fresh RunState → play intro → enter Zone 1 overworld
- FR-4: RunState serialization: CardDef, GridUnitTemplate, Effect, Keyword all implement `serde::Serialize`/`serde::Deserialize`.
- FR-5: RunState deserialization validates: (a) file is valid JSON, (b) required fields exist, (c) card_collection indices are in bounds, (d) version matches. On validation failure, show "Save corrupted" message and offer New Run.
- FR-6: Save file includes `version: i32` field. Current version = 1. Future versions use migration or rejection.
- FR-7: Cleanup: old browser localStorage code paths (Prisma, Node persistence, better-sqlite3, all mentions of `localStorage`) removed from the project.

### Non-Functional Requirements

- NFR-1: Save file size < 100KB (single-slot JSON, ~200 cards × serialized CardDef)
- NFR-2: Serialize < 10ms, Deserialize < 20ms (measured on desktop hardware)
- NFR-3: No data loss on crash: save is written atomically (write to temp file, rename)
- NFR-4: All save logic is pure Rust (core) + thin gdext FileAccess wrapper

## Acceptance Criteria

- [ ] AC-1: `user://save_0.json` created after first node transition
- [ ] AC-2: Save file is valid JSON with all required fields
- [ ] AC-3: CardDef, Effect, Keyword, GridUnitTemplate implement Serialize/Deserialize
- [ ] AC-4: Loading from Continue restores gold, HP, collection, deck, stash, position, zones
- [ ] AC-5: Auto-save triggers on node transition, battle end, shop, crafting, deck change
- [ ] AC-6: New Run creates fresh RunState
- [ ] AC-7: Corrupted save file shows error message and offers New Run
- [ ] AC-8: Save + load round-trip produces identical state (property-by-property assertion)
- [ ] AC-9: Atomic save (temp file rename) prevents partial-write corruption
- [ ] AC-10: Serialize < 10ms, Deserialize < 20ms
- [ ] AC-11: All old browser/localStorage/prisma persistence code removed
- [ ] AC-12: `cargo test` passes with new save/load tests

## Scenarios

### Scenario 1: First Save
**Given** the player has progressed to Zone 1 Node 3 with 120 gold, 25 HP, 26 cards in collection
**When** they transition to Node 4
**Then** `user://save_0.json` is created
**Then** the file contains the correct gold, HP, zone, node, and card data
**Then** the save file is valid JSON, under 100KB

### Scenario 2: Continue from Menu
**Given** a save file exists from Scenario 1
**When** the player boots the game
**Then** the menu shows "Continue" as an option
**When** they click Continue
**Then** RunState loads: 120 gold, 25 HP, 26 cards, current zone = Zone 1, current node = Node 4
**Then** the overworld scene renders at Node 4 with the correct state

### Scenario 3: Save Corruption
**Given** `user://save_0.json` has been manually edited to contain invalid JSON
**When** the player clicks Continue
**Then** a dialog appears: "Save file corrupted. Start a new run?"
**Then** clicking Yes starts a New Run
**Then** clicking No returns to menu

### Scenario 4: Atomic Save Prevents Partial Writes
**Given** a save is in progress
**When** the game crashes mid-write
**Then** the temp file is incomplete, but the original save file is unchanged
**When** the game restarts
**Then** Continue loads from the intact original save (not the partial temp file)

## Technical Notes

- Core module: `rust/src/core/save/` — `save_manager.rs` (serialize, deserialize, validate)
- Data types: `SaveData` struct with version, run_state, card_collection, combat_deck_indices, stash_indices, metadata
- serde: `#[derive(Serialize, Deserialize)]` on CardDef, Effect, Keyword, GridUnit, GridUnitTemplate, RunState, OverworldState, SaveData
- Godot bridge: `GodotSaveManager` gdext class wraps the pure Rust save/load functions. It uses `godot::engine::FileAccess` to read/write JSON strings.
- Atomic write: write to `user://save_0.json.tmp`, then rename to `user://save_0.json`. Godot's `DirAccess.rename()` is used for the rename step.
- Validation: deserialize JSON, check `version == 1`, validate indices are in bounds of card_collection, check card_collection is non-empty.
- The overworld bridge calls `save_manager::save()` on node transitions and battle end. The menu bridge calls `save_manager::load()` on Continue.
- All old persistence code (localStorage/Prisma/SQLite/Node native modules) is identified by grep and removed. This specifically targets files that referenced the old Excalibur/Svelte stack.

## Open Questions

- [ ] OQ-1: **(RESOLVED)** Single-slot Phase 1. Multi-slot deferred.
- [ ] OQ-2: **(RESOLVED)** JSON format (not binary/ConfigFile/Resource) for debuggability. serde JSON is fast enough for < 100KB.
- [ ] OQ-3: **(RESOLVED)** Atomic write via temp file + rename. Godot's FileAccess + DirAccess supports this.
- [ ] OQ-4: Should we encrypt or obfuscate the save file? → No. Single-player PvE game. JSON readability is more valuable than anti-cheat.