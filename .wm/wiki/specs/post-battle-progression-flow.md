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

Define the flow between combat encounters: victory rewards, overworld navigation, NPC interactions, and deck management. This completes the loop from "win battle" through "manage deck" to "next battle" — enabling the crafting/affix system to plug in.

## Locked Decisions

- D13: **Node-based overworld** — Cross Blitz / Slay the Spire style. Stylized map with connected nodes (battle, shop, rest, enchanter, gambler). Click to travel.
- D14: **Node-type-dependent flow** — Battle nodes: reward screen → map. Shop/Enchanter/Gambler: open their UI. Rest: heal prompt.
- D15: **Deck management anytime** — Accessible outside combat via button/key. Swap between 10-card combat deck and 30-card stash.
- D16: **Reward: choose 1 of 3** — After victory, pick one card from three random offers. Plus gold.

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
- FR-13: Deck screen shows 10 combat deck slots + 30 stash slots, drag/swao between them
- FR-14: Gold persists across the campaign, earned from battles, spent at shops/NPCs
- FR-15: Card collection persists across the campaign, grows from rewards and purchases
- FR-16: Paths on the map are blocked until story progression unlocks them (boss kills)

### Non-Functional Requirements

- NFR-1: Overworld state saved on every node transition
- NFR-2: Deck management changes are persisted immediately
- NFR-3: Reward card pool is seeded deterministic from run seed

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

### Scenario 3: Visit Enchanter
**Given** the player is on an Enchanter node
**When** they click it
**Then** the crafting UI opens
**Then** they can select a card and pay gold to reroll an affix or add a slot
**When** they leave
**Then** they return to the overworld map

### Scenario 4: Shop Visit
**Given** the player has 150 gold
**When** they enter a Shop node
**Then** the shop UI shows 4-6 cards for sale with prices
**When** they buy a card costing 50 gold
**Then** the card is added to collection
**Then** gold is reduced to 100
**When** they leave
**Then** they return to the overworld map

### Scenario 5: Blocked Path
**Given** the player is on a node connected to a locked zone
**When** they attempt to travel there
**Then** a message says "Defeat the zone boss to unlock this path"
**When** they defeat the boss
**Then** the path is unlocked and travelable

## Technical Notes

- Overworld is a Rust core module `rust/src/core/overworld/` with model/service split
- Overworld state: current_node, unlocked_paths, gold, card_collection (Vec<CardDef>), defeated_nodes
- Card collection starts with 2 copies of each starter card = 26 cards
- Reward generation: pick 3 random cards from a pool (weighted by rarity, excludes full-duplicate cards beyond 2 copies)
- The bridge scene for overworld can be simpler than battle — mostly clickable nodes and UI panels
- Deck management UI is a Godot scene triggered from the overworld bridge

## Open Questions

- [ ] OQ-1: **(RESOLVED)** Boss nodes reward Rare+ cards only.
- [ ] OQ-2: **(RESOLVED)** Branching paths (StS style) — player chooses between more battles (more rewards) vs shorter path to boss.
- [ ] OQ-3: **(RESOLVED)** Visible hero icon that animates between nodes on click.