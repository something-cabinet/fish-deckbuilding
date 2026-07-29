---
title: Enemy System — Deck, AI Card Play, and Difficulty
type: spec
status: approved
tags:
- game-design
- enemy
- cards
- ai
- combat
---

## Overview

Define enemy deck composition, card-play AI, and difficulty scaling for the tactical RPG. Enemies use the same card system as the player. Early development uses one AI pattern (highest-damage affordable card) — special unique AI deferred.

## Locked Decisions

- D10: **Shared card system** — Enemies use identical CardDef, hand, deck, and effect resolution as the player.
- D11: **Same AI, scaled stats** — Early enemies share the same basic AI. Variety comes from more HP and better cards.
- D12: **Gold drop by difficulty** — Gold reward scales with enemy difficulty level (exact formula deferred to loot system spec).

## Requirements

### Functional Requirements

- FR-1: Each enemy has a deck of cards (size varies by difficulty: easy 10, medium 15, hard 20)
- FR-2: Enemy deck is pre-defined per enemy type (static, not randomly generated)
- FR-3: Enemy starts battle with hand of 3 cards (smaller than player's 5)
- FR-4: Enemy draws 1 card at end of its turn (same draw rule as player)
- FR-5: Enemy AI card priority: play the highest-damage card it can afford with its current mana
- FR-5a: If no damage card is affordable, play the cheapest card in hand
- FR-5b: If no affordable damage card, play Shield if below 50% HP, then Heal if below 30% HP, then cheapest card
- FR-5c: If no card is affordable, skip (pass turn)
- FR-5d: Enemy always base-attacks if adjacent, regardless of card play
- FR-6: Enemy mana: +1 per turn, starts at 0, caps at 5 (simpler than player's 9)
- FR-7: Enemy cards target the nearest enemy unit (player or player summons)
- FR-8: Enemy AI for AoE cards: target the tile that hits the most allied units
- FR-9: Enemy difficulty tiers increase HP and card quality:
  | Tier | HP | Deck size | Cards |
  |------|----|-----------|-------|
  | Easy | 8 | 10 | Common only |
  | Medium | 14 | 15 | Common + Uncommon |
  | Hard | 22 | 20 | Common + Uncommon + Rare |
- FR-10: Gold drop per enemy tier:
  | Tier | Gold |
  |------|------|
  | Easy | 5 |
  | Medium | 12 |
  | Hard | 25 |

### Non-Functional Requirements

- NFR-1: Enemy card play uses the same `resolve_effect` function as player cards
- NFR-2: Enemy AI decision must be deterministic from seed
- NFR-3: Enemy turn completes in < 100ms (no perceptible delay)

## Acceptance Criteria

- [ ] AC-1: Enemy starts battle with a pre-defined deck and hand of 3
- [ ] AC-2: Enemy draws 1 card at end of its turn
- [ ] AC-3: Enemy AI plays highest-damage affordable card targeting nearest enemy
- [ ] AC-4: Enemy AoE targets tile hitting the most allies
- [ ] AC-5: Enemy mana increments by +1 each turn, starts at 0, caps at 5
- [ ] AC-6: Enemy HP and card quality match difficulty tier table
- [ ] AC-7: Gold dropped matches difficulty tier table
- [ ] AC-8: Same card used by player and enemy resolves identically
- [ ] AC-9: All tests pass with `cargo test`

## Scenarios

### Scenario 1: Enemy Plays Damage Card
**Given** a Medium enemy (14 HP, 5 mana) with a card costing 3 mana dealing Damage(4)
**When** the enemy turn runs
**Then** the enemy plays Damage(4) at the nearest allied unit
**Then** 3 mana is deducted from the enemy's mana pool
**Then** the card moves to enemy graveyard

### Scenario 2: Enemy Cannot Afford Any Card
**Given** a Hard enemy with 1 mana, and its cheapest card costs 2 mana
**When** the enemy turn runs
**Then** the enemy skips card play (pass)
**Then** the enemy still performs its base attack if adjacent

### Scenario 3: Enemy Smart Play — Shield
**Given** a Medium enemy with 5 HP out of 14 (below 50%), holding a Shield 4 card costing 2 mana (affordable)
**When** the enemy turn runs
**Then** the AI prioritizes Shield over damage cards
**Then** Shield 4 is played on the enemy itself
**Then** enemy now has 4 shield

### Scenario 4: Enemy Always Base-Attacks
**Given** an enemy adjacent to the player unit
**When** the enemy turn runs
**Then** the enemy plays a card from hand (if possible)
**Then** the enemy also performs its base attack on the player unit
**Then** the player takes damage from both the card and the base attack

### Scenario 5: Enemy AoE Targeting
**Given** an enemy with a card dealing Damage(3), Range 3, AoE 2 (cross)
**When** the enemy turn runs
**Then** the AI evaluates all tiles within range 3
**Then** it picks the tile where the cross would hit the most allied units
**Then** the card resolves with that tile as center

### Scenario 6: Difficulty Scaling
**Given** an Easy enemy with 8 HP, deck of 10 Common cards
**When** it takes damage
**Then** its max HP is 8
**When** it draws cards
**Then** all cards in its deck are Common rarity
**When** defeated
**Then** it drops 5 gold

## Technical Notes

- Enemy deck is a `Vec<CardDef>` defined per enemy type in a data structure
- Enemy AI lives in `rust/src/core/battle/ai/decide.rs` — currently has basic movement AI; card-play AI added there
- Enemy card targeting: `fn pick_card_target(enemy_pos, allies: &[GridUnit]) -> (i32, i32)` — for AoE, evaluates all valid center tiles and picks the one with most targets
- Enemy gold drop stored on enemy type, not computed dynamically
- Mana cap of 5 for enemies (vs player's 9) keeps enemy turns fast and predictable
- Enemy hand size of 3 (vs player's 5) for same reason

## Open Questions

- [ ] OQ-1: **(RESOLVED)** Smart enemy play — Shield if <50% HP, Heal if <30% HP, otherwise damage.
- [ ] OQ-2: **(RESOLVED)** Fixed deck per enemy type.
- [ ] OQ-3: **(RESOLVED)** Enemy always does both — plays a card (if possible) AND base-attacks (if adjacent) every turn.