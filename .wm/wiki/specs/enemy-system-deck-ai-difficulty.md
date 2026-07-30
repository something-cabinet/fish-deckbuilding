---
title: Enemy System — Deck, AI Card Play, and Difficulty
type: spec
tags: [game-design, enemy, cards, ai, combat]
status: approved
---

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

Define enemy deck composition, card-play AI, and difficulty scaling for the tactical RPG. Enemies use the same card system as the player. Updated to include multi-unit AI management, lethal detection, unified Range enum for unit attacks, and exhaustion counters.

## Locked Decisions

- D10: **Shared card system** — Enemies use identical CardDef, hand, deck, and effect resolution as the player.
- D11: **Same AI, scaled stats** — Early enemies share the same basic AI. Variety comes from more HP and better cards.
- D12: **Gold drop by difficulty** — Gold reward scales with enemy difficulty level.
- D13: **Multi-unit AI** — When multiple enemy units exist on the grid, AI iterates all usable units, sorts by priority score (bounty = ATK + HP + tier), and executes move/attack/card for each. Units with higher priority act first.
- D14: **Lethal detection** — Before any other AI action, check if any unit can deal lethal damage to the hero. If so, that unit executes a lethal attack first.
- D15: **Unified Range enum** — GridUnit uses the same `Range { Melee, Ranged }` enum as cards. `Range::Melee` = Chebyshev 1 (8-way adjacent). `Range::Ranged` = any tile on the board. Replaces numeric `attack_range`.
- D16: **Exhaustion counters** — Replace `has_moved`/`has_attacked` bools with `moves_made: i32`/`attacks_made: i32` counters and `max_moves: i32` (default 1)/`max_attacks: i32` (default 1). Supports multi-attack (Celerity) and summoning sickness later.

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
- FR-9: Enemy difficulty tiers:
  | Tier | HP | Deck size | Cards | Move | Range |
  |------|----|-----------|-------|------|-------|
  | Easy | 8 | 10 | Common only | 2 | Melee |
  | Medium | 14 | 15 | Common + Uncommon | 2 | Melee |
  | Hard | 22 | 20 | Common + Uncommon + Rare | 2 | Melee |
  | Ranged | 10 | 12 | Common + Uncommon | 1 | Ranged |
  | Boss | 30+ | 25 | All rarities | 2 | Melee |
- FR-10: Gold drop per enemy tier:
  | Tier | Gold |
  |------|------|
  | Easy | 5 |
  | Medium | 12 |
  | Hard | 25 |
  | Boss | 50 |
- FR-11: **Multi-unit AI** — AI `decide()` iterates all enemy units; for each unit, computes best action (move → attack → card play). Units act in order of priority score (bounty = ATK + HP + tier_value). Action-filtering: skip units that cannot act (exhausted).
- FR-12: **Lethal detection** — Before computing per-unit actions, scan all enemy units for a lethal kill on the hero. If any unit can reach and deal lethal damage, all available units prioritize the lethal strike. If multiple units can deal lethal, the lowest-priority unit delivers the kill.
- FR-13: **Unified Range on GridUnit** — `range: Range` determines attack distance. `Range::Melee` = Chebyshev distance 1 (8-way). `Range::Ranged` = any tile on the board. `move_points: i32` determines BFS budget (default 2). See `wiki:specs:card-system-in-battle-deck` for the Range enum definition.
- FR-13a: Counterattack uses the defender's Range. Melee defender counterattacks only adjacent attackers. Ranged defender counterattacks at any distance.
- FR-14: **Exhaustion counters** — `moves_made` increments per move step, `attacks_made` increments per attack. Unit is exhausted when `moves_made >= max_moves AND attacks_made >= max_attacks`. Reset both to 0 on turn start. Supports multi-action units via `max_moves > 1` or `max_attacks > 1`.

### Non-Functional Requirements

- NFR-1: Enemy card play uses the same `resolve_effect` function as player cards
- NFR-2: Enemy AI decision must be deterministic from seed
- NFR-3: Enemy turn completes in < 100ms for ≤5 units (no perceptible delay)

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
- [ ] AC-10: AI iterates all enemy units, sorts by priority, executes action per unit
- [ ] AC-11: AI detects lethal damage on hero before taking non-lethal actions
- [ ] AC-12: GridUnit uses `range: Range` (Melee/Ranged) instead of numeric attack_range
- [ ] AC-13: `Range::Ranged` unit can attack any tile on the grid
- [ ] AC-14: `Range::Melee` unit attacks only adjacent (Chebyshev 1) tiles
- [ ] AC-15: Melee defender counterattacks only adjacent attackers
- [ ] AC-16: Ranged defender counterattacks at any distance
- [ ] AC-17: `has_moved`/`has_attacked` replaced with `moves_made`/`attacks_made` counters
- [ ] AC-18: `max_moves`/`max_attacks` default to 1, configurable per unit
- [ ] AC-19: Unit with `max_attacks = 2` (Celerity) can attack twice per turn
- [ ] AC-20: Exhaustion correctly prevents actions when all counters exhausted

## Scenarios

### Scenario 1: Ranged Enemy Attacks from Distance
**Given** a Ranged enemy (HP 10, ATK 3, Range::Ranged) at (8, 2) and hero at (0, 2)
**When** the enemy turn runs
**Then** the enemy attacks the hero directly (no movement needed — full board range)
**Then** hero takes 3 damage
**Then** hero does NOT counterattack (melee can't reach)

### Scenario 2: Ranged Defender Counterattacks
**Given** a Ranged enemy (HP 10, ATK 3, Range::Ranged) adjacent to hero
**When** the hero attacks the Ranged enemy
**Then** hero deals damage to the enemy
**Then** the Ranged enemy counterattacks (Range::Ranged always reaches — even at adjacency)
**Then** hero takes counter damage

### Scenario 3: Melee Defender Cannot Counterattack from Distance
**Given** a Ranged hero attacking a Melee enemy 5 tiles away
**When** the Ranged hero attacks the Melee enemy
**Then** hero deals damage
**Then** Melee enemy does NOT counterattack (Range::Melee can't reach 5 tiles)

### Scenario 4: Speed/Reach Variation
**Given** a Ranged enemy with move_points = 1 and Range::Ranged
**When** the AI runs
**Then** the enemy moves slowly (1 tile/turn) but can attack any tile
**Given** a Fast melee enemy with move_points = 4
**Then** the enemy can cross the 9×5 grid in 2 turns

## Technical Notes

- `Range` enum defined in `rust/src/core/cards/` or `rust/src/core/grid/model/` — shared import between card system and combat system
- GridUnit `range` field replaces numeric `attack_range: i32`. No more magic number `99`.
- `can_attack(from, to, state)` checks `attacker.range` instead of hardcoded adjacency — `Melee` = Chebyshev(1), `Ranged` = always true
- `can_counterattack(defender, attacker_pos)` checks `defender.range`: `Melee` requires attacker adjacent, `Ranged` always true — matches Duelyst's strikeback behavior
- Exhaustion: `GridUnit` fields `moves_made: i32, attacks_made: i32, max_moves: i32, max_attacks: i32`
- Enemy gold drop stored on enemy type

## Open Questions

- [ ] OQ-1: **(RESOLVED)** Smart enemy play — Shield if <50% HP, Heal if <30% HP, otherwise damage.
- [ ] OQ-2: **(RESOLVED)** Fixed deck per enemy type.
- [ ] OQ-3: **(RESOLVED)** Enemy always does both — plays a card (if possible) AND base-attacks (if adjacent) every turn.
- [ ] OQ-4: **(RESOLVED)** Multi-unit AI iterates all units sorted by priority.
- [ ] OQ-5: **(RESOLVED)** Lethal detection is per-unit (no complex coordination in Phase 1).
- [ ] OQ-6: **(RESOLVED)** Unified Range enum (Melee/Ranged) replaces numeric attack_range, shared between units and cards.
- [ ] OQ-7: **(RESOLVED)** Ranged counterattack at any distance, melee only adjacent — matches Duelyst.
- [ ] OQ-8: **(RESOLVED)** Exhaustion counters replace bools to support multi-attack (Celerity) and summoning sickness.