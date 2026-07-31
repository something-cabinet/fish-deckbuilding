---
title: Save/Load — Godot ConfigFile/Resource Persistence
type: spec
tags: [godot, persistence, save, rust, gdext]
status: draft
---

## Overview

Replace the old browser-localStorage save concept with Godot's native persistence (JSON files under `user://`). Full save/load of RunState: gold, HP, card collection, combat deck, stash, current node, unlocked zones, defeated bosses. Auto-save on critical transitions, manual Continue/New Run from menu.

This spec formalizes the save/load integration points referenced in `wiki:specs:post-battle-progression-flow` (FR-21–FR-24). The old Prisma/Node/browser persistence code paths are fully removed.

## Locked Decisions

- D1: **JSON via serde** — RunState serialized to JSON using serde + serde_json. Human-readable, debuggable, extensible.
- D2: **std::fs for file I/O** — Files written/read via `std::fs` (bridge module), stored at `save_0.json` relative to working directory. Godot `FileAccess` deferred to Phase 2.
- D3: **Single-slot Phase 1** — One save slot (`save_0.json`). Multi-slot deferred to Phase 2.
- D4: **Auto-save** — Save triggered automatically on: node transition, battle end (victory/defeat), shop purchase, crafting operation. No auto-save timer.
- D5: **Manual load** — Menu shows "Continue" (if save exists) or "New Run". No auto-load.
- D6: **Full CardDef serialization** — Cards stored as full JSON objects (not indices into a separate collection). Simpler, debuggable, and avoids index-boundary bugs.

## Requirements

### Functional Requirements

- FR-1: Save file `save_0.json` contains:
  - `version` — schema version (currently 1)
  - `run_state` — gold, hp, max_hp, current_node_id, unlocked_zone_ids, defeated_boss_ids, completed_node_ids (full RunState serialization)
  - `timestamp` — unix epoch seconds when saved
- FR-2: Save triggers (auto-save):
  - After every node transition in the overworld
  - After battle victory (reward screen shown)
  - After battle defeat (return to overworld)
  - After shop purchase
  - After crafting operation (reroll, add slot, corrupt)
  - After deck management change
  - On manual save (if user requests)
- FR-3: Load flow: on game boot → menu scene → check `save_0.json` exists → show "Continue" button
  - "Continue": deserialize JSON → restore RunState → jump to overworld at current_node
  - "New Run": generate fresh RunState → play intro → enter Zone 1 overworld
- FR-4: RunState serialization: CardDef, Affix, Effect, CardEffect, Range, Faction, TargetFilter all implement `serde::Serialize`/`serde::Deserialize`.
- FR-5: RunState deserialization validates: (a) file is valid JSON, (b) version == 1. On validation failure, show "Save corrupted" message and offer New Run.
- FR-6: Save file includes `version: i32` field. Current version = 1. Future versions use migration or rejection.
- FR-7: Cleanup: old browser localStorage code paths (Prisma, Node persistence, better-sqlite3, all mentions of `localStorage`) removed from the project.

### Non-Functional Requirements

- NFR-1: Save file size < 100KB (single-slot JSON, ~200 cards × serialized CardDef)
- NFR-2: Serialize < 10ms, Deserialize < 20ms (measured on desktop hardware)
- NFR-3: All save logic is pure Rust (core) + thin std::fs wrapper in bridge

## Acceptance Criteria

- [x] AC-1: `save_0.json` created after first crafting operation
- [x] AC-2: Save file is valid JSON with all required fields
- [x] AC-3: CardDef, Effect, Affix, CardEffect, Range, Faction, TargetFilter implement Serialize/Deserialize
- [ ] AC-4: Loading from Continue restores gold, HP, collection, deck, stash, position, zones
- [x] AC-5: Auto-save triggers on crafting operation
- [ ] AC-6: New Run creates fresh RunState
- [ ] AC-7: Corrupted save file shows error message and offers New Run
- [x] AC-8: Save + load round-trip produces identical state (property-by-property assertion)
- [x] AC-9: Serialize < 10ms, Deserialize < 20ms
- [x] AC-10: `cargo test` passes with new save/load tests

## Scenarios

### Scenario 1: First Save
**Given** the player has progressed through some nodes with gold and cards
**When** they perform a crafting operation
**Then** `save_0.json` is created
**Then** the file contains the correct gold, HP, and card data
**Then** the save file is valid JSON, under 100KB

### Scenario 2: Continue from Menu
**Given** a save file exists from Scenario 1
**When** the player boots the game
**Then** the menu shows "Continue" as an option
**When** they click Continue
**Then** RunState loads: gold, HP, cards, current node
**Then** the overworld scene renders at the correct state

### Scenario 3: Save Corruption
**Given** `save_0.json` has been manually edited to contain invalid JSON
**When** the player clicks Continue
**Then** a dialog appears: "Save file corrupted. Start a new run?"
**Then** clicking Yes starts a New Run
**Then** clicking No returns to menu

## Technical Notes

- Core module: `rust/src/core/save/` — `save_manager.rs` (SaveData struct, serde serialize/deserialize)
- Data types: `SaveData` struct with version, run_state, timestamp
- serde: `#[derive(Serialize, Deserialize)]` on CardDef, Affix, Effect, CardEffect, Rarity, BuffType, AffixType, CorruptOutcome, RunState, NodeType, OverworldNode, Range, Faction, TargetFilter
- `&'static str` fields on CardDef (id, name) and Affix (description) changed to `String` for serde compatibility
- Bridge module: `rust/src/bridge/save_manager.rs` — `save_run_state()` / `load_run_state()` using `std::fs`
- Auto-save wired into `on_confirm()` in `overworld_scene.rs` — saves after every successful crafting operation
- All old persistence code (localStorage/Prisma/SQLite/Node native modules) to be identified and removed

## Open Questions

- [ ] OQ-1: **(RESOLVED)** Single-slot Phase 1. Multi-slot deferred.
- [ ] OQ-2: **(RESOLVED)** JSON format (not binary/ConfigFile/Resource) for debuggability. serde JSON is fast enough for < 100KB.
- [ ] OQ-3: **(RESOLVED)** std::fs for file I/O (Godot FileAccess deferred to Phase 2). No atomic write yet.
- [ ] OQ-4: Should we encrypt or obfuscate the save file? → No. Single-player PvE game. JSON readability is more valuable than anti-cheat.