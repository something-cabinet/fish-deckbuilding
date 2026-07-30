---
title: Post-Battle & Progression Flow
type: spec
tags: [game-design, overworld, progression, rewards, deck-management]
status: approved
---

---
title: Post-Battle & Progression Flow
type: spec
status: approved
tags:
- game-design
- overworld
- progression
- rewards
- deck-management
---

## Overview

Define the flow between combat encounters: victory rewards, overworld navigation, NPC interactions, and deck management. This completes the loop from "win battle" through "manage deck" to "next battle" — enabling the crafting/affix system to plug in. Updated to include zone unlock system (story chapter gates) and save/load integration point.

## Locked Decisions

- D13: **Node-based overworld** — Cross Blitz / Slay the Spire style. Stylized map with connected nodes (battle, shop, rest, enchanter, gambler). Click to travel.
- D14: **Node-type-dependent flow** — Battle nodes: reward screen → map. Shop/Enchanter/Gambler: open their UI. Rest: heal prompt.
- D15: **Deck management anytime** — Accessible outside combat via button/key. Swap between 10-card combat deck and 30-card stash.
- D16: **Reward: choose 1 of 3** — After victory, pick one card from three random offers. Plus gold.
- D17: **Zone unlock system** — The overworld is divided into zones, each gated by a boss defeat. Beating the zone boss unlocks the path to the next zone. Story chapters precede each new zone unlock (dialogue/cutscene). Initially only Zone 1 is accessible.
- D18: **Save/load integration** — RunState (gold, card_collection, deck, current_node, unlocked_zones, defeated_bosses) is serialized to JSON and saved via Godot's user:// persistence (ConfigFile or Resource). Auto-save on every node transition and after battle completion. Manual load from menu.

## Requirements

### Functional Requirements

- FR-1: Overworld is a node-based map with connected destinations rendered as clickable icons
- FR-1a: A hero icon is visible on the current node, animates along the path when traveling to a new node
- FR-2: Node types: Battle, Rest, Shop, Enchanter, Gambler, Boss
- FR-3: Clicking a Battle node starts a combat encounter
- FR-4: After victory: reward screen showing 3 random card choices + gold earned
- FR-5: Player selects 1 card to add to collection, gold is auto-added
- FR-6: After reward, return to overworld map at current node
- FR-6a: Boss node rewards offer Rare+ cards only (no Common/Uncommon)
- FR-7: After defeat: return to overworld with current HP (no permadeath)
- FR-8: Rest node: heal ~10 HP (or to full if below that), then return to map
- FR-9: Shop node: open shop UI showing cards for sale with gold prices
- FR-10: Enchanter node: open crafting UI (reroll affix, add slot)
- FR-11: Gambler node: open gamble UI (corrupt card)
- FR-12: Deck management screen accessible via button on overworld or node results
- FR-13: Deck screen shows 10 combat deck slots + 30 stash slots, drag/swap between them
- FR-14: Gold persists across the campaign, earned from battles, spent at shops/NPCs
- FR-15: Card collection persists across the campaign, grows from rewards and purchases
- FR-16: Paths on the map are blocked until story progression unlocks them (boss kills)
- FR-17: **Zone unlock** — Overworld divided into zones (Zone 1: Shallows, Zone 2: Midwaters, Zone 3: Depths, etc.). Each zone has a Boss node. Defeating the boss unlocks the next zone's entrance path. Zone 1 is always unlocked.
- FR-18: **Story chapter trigger** — When the player defeats a zone boss, a story chapter dialogue/cutscene plays before revealing the path to the next zone.
- FR-19: **Zone display** — Each zone is visually distinct on the overworld map (different background color/tint, zone label). Locked zones show a lock icon + "?" on the entry path.
- FR-20: **Zone encounter pool** — Each zone has its own encounter pool (enemy types, difficulty tiers, card rewards). Higher zones = harder enemies + better rewards.
- FR-21: **Save/load: auto-save triggers** — Save is triggered on: (a) every node transition, (b) after battle victory/defeat reward screen, (c) after shop purchase, (d) after crafting operation. Save writes to `user://save_0.json` (slot 0 for single-slot).
- FR-22: **Save/load: save data format** — Save file contains: `run_state` (gold, hp, max_hp, current_node, unlocked_zones, defeated_bosses, completed_nodes), `card_collection` (Vec<SerializedCardDef>), `combat_deck_indices` (10 Vec<usize> into collection), `stash_indices` (remaining Vec<usize>).
- FR-23: **Save/load: load flow** — On game start from menu, check for existing save file. If found, offer Continue/New Run. Continue deserializes JSON → RunState. New Run creates fresh state.
- FR-24: **Save/load: serialization** — CardDef, RunState, and OverworldState implement serde Serialize/Deserialize. JSON format for readability and debugging.

### Non-Functional Requirements

- NFR-1: Overworld state saved on every node transition
- NFR-2: Deck management changes are persisted immediately
- NFR-3: Reward card pool is seeded deterministic from run seed
- NFR-4: Save/load uses Godot's `user://` directory (cross-platform, persists across app restarts)
- NFR-5: Save file size must be < 100KB (JSON, single-slot)
- NFR-6: Serialization/deserialization must complete in < 50ms

## Acceptance Criteria

- [ ] AC-1: Node-based map renders with clickable Battle, Rest, Shop, Enchanter, Gambler nodes
- [ ] AC-2: Clicking Battle node transitions to combat scene
- [ ] AC-3: Victory shows reward screen with 3 card choices + gold
- [ ] AC-4: Selected card added to collection, gold added to total
- [ ] AC-5: After reward → return to overworld map
- [ ] AC-6: Defeat → return to overworld (no restart needed)
- [ ] AC-7: Rest node heals hero ~10 HP, returns to map
- [ ] AC-8: Deck management screen opens from overworld, shows 10 deck + 30 stash slots
- [ ] AC-9: Cards can be moved between combat deck and stash
- [ ] AC-10: Combat deck limited to 10 cards, stash to 30
- [ ] AC-11: Shop node shows purchasable cards with gold prices
- [ ] AC-12: Enchanter node triggers crafting UI (affixes)
- [ ] AC-13: Gold and card collection persist across the session
- [ ] AC-14: Blocked paths show visual lock, unlock after boss kills
- [ ] AC-15: Overworld has 3+ zones, each visually distinct, Zone 1 unlocked initially
- [ ] AC-16: Defeating a zone boss triggers a story chapter dialogue
- [ ] AC-17: After boss defeat, path to next zone unlocks
- [ ] AC-18: Each zone has a unique encounter pool (different enemies, different rewards)
- [ ] AC-19: Save file created at `user://save_0.json` after first node transition
- [ ] AC-20: Save file updated on every auto-save trigger
- [ ] AC-21: Load from menu restores full run state (gold, cards, deck, position, zones)
- [ ] AC-22: New Run creates fresh state, overwrites save after first transition
- [ ] AC-23: CardDef and RunState implement Serialize/Deserialize
- [ ] AC-24: Save file is valid JSON, readable, and under 100KB

## Scenarios

### Scenario 1: Win Battle → Reward → Map
**Given** the player wins a battle on a Battle node
**When** the victory banner appears
**Then** the reward screen shows 3 random cards and gold earned
**When** the player clicks a card
**Then** the card is added to collection
**Then** gold is added to total
**Then** the overworld map is shown with the current node marked as cleared

### Scenario 2: Between-Battle Deck Management
**Given** the player is on the overworld map
**When** they press the Deck button
**Then** the deck screen opens showing 10 combat deck slots (filled) and 30 stash slots
**When** they drag a card from deck to stash
**Then** the card moves to stash, freeing a deck slot
**When** they drag another card from stash to deck
**Then** the card moves to the combat deck
**When** they close the screen
**Then** the updated combat deck is saved

### Scenario 3: Zone Unlock via Boss Defeat
**Given** the player is in Zone 1 (Shallows)
**When** they defeat the Zone 1 Boss (Shark Enforcer)
**Then** a story dialogue plays: "Guppy escapes the shallows..."
**Then** the path to Zone 2 (Midwaters) is unlocked
**Then** the Zone 2 entry node becomes visible and clickable on the map
**Then** a save is triggered

### Scenario 4: Save and Load
**Given** the player has progressed to Zone 2 with 150 gold, 22 HP, 28 cards in collection
**When** they quit the game
**Then** `user://save_0.json` contains all state
**When** they start the game again
**Then** the menu shows "Continue" (alongside "New Run")
**When** they click Continue
**Then** the overworld loads at the correct node with 150 gold, 22 HP, 28 cards
**When** they click New Run
**Then** fresh state starts from Zone 1

### Scenario 5: Blocked Path
**Given** the player is on a node connected to a locked zone
**When** they attempt to travel there
**Then** a message says "Defeat the zone boss to unlock this path"
**When** they defeat the boss
**Then** the path is unlocked and travelable

## Technical Notes

- Overworld is a Rust core module `rust/src/core/overworld/` with model/service split
- Overworld state: current_node, unlocked_paths, gold, card_collection (Vec<CardDef>), defeated_nodes, unlocked_zones, defeated_bosses
- Zone model: `Zone` struct with `id`, `name`, `encounter_pool: Vec<EnemyTemplate>`, `boss_id`, `is_unlocked: bool`
- Card collection starts with 2 copies of each starter card = 26 cards
- Reward generation: pick 3 random cards from a pool (weighted by rarity, excludes full-duplicate cards beyond 2 copies)
- The bridge scene for overworld can be simpler than battle — mostly clickable nodes and UI panels
- Deck management UI is a Godot scene triggered from the overworld bridge
- **Save/load**: Implemented as a new Rust core module `rust/src/core/save/` with `save_manager.rs`
- Serialization: Use `serde` + `serde_json` for JSON serialization. CardDef, RunState derive Serialize/Deserialize.
- Godot bridge: `GodotSaveManager` (gdext class) wraps the save core, reads/writes files via `godot::engine::FileAccess`.
- Zones defined in a data file `rust/src/core/overworld/zones.rs` as a static array.

## Open Questions

- [ ] OQ-1: **(RESOLVED)** Boss nodes reward Rare+ cards only.
- [ ] OQ-2: **(RESOLVED)** Branching paths (StS style) — player chooses between more battles (more rewards) vs shorter path to boss.
- [ ] OQ-3: **(RESOLVED)** Visible hero icon that animates between nodes on click.
- [ ] OQ-4: **(RESOLVED)** Zone encounter pools — each zone has unique enemies and reward tables.
- [ ] OQ-5: **(RESOLVED)** Save/load uses `user://save_0.json` with serde JSON. Single-slot for Phase 1.
- [ ] OQ-6: **(RESOLVED)** Auto-save triggers on node transition, battle end, shop purchase, crafting operation.
- [ ] OQ-7: **(RESOLVED)** 3 zones minimum for Phase 1: Shallows, Midwaters, Depths.