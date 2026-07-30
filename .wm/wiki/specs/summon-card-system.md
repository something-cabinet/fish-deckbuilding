---
title: Summon Card System — Unit Spawning and Minion Management
type: spec
id: wiki:specs:summon-card-system
status: draft
tags: [game-design, cards, combat, units, summon]
---

---
title: Summon Card System — Unit Spawning and Minion Management
type: spec
status: draft
tags: [game-design, cards, combat, units, summon]
---

## Overview

Add the Summon card type that spawns a unit onto the grid. This enables minion-based gameplay — one of the core tactical layers in Duelyst. Summon cards create allied units that act independently on subsequent turns, controlled by the same player. This spec covers the card type, spawning rules, summoning sickness, and minion behavior.

Supersedes the FR-5 placeholder in `wiki:specs:fish-tactical-rpg`. See `wiki:specs:card-system-in-battle-deck` for the base card system this builds on.

## Locked Decisions

- D1: **Summon card type** — A Summon card has a `CardDef` with an embedded `summon: SummonData` field containing: `unit_template: GridUnitTemplate`, `spawn_tag: SpawnTag` (Adjacent, Nearby, AnyFriendly). Summon cards cost mana like all other cards.
- D2: **Summoning sickness** — Spawned units enter play exhausted (`moves_made = max_moves`, `attacks_made = max_attacks`). They cannot move or attack on the turn they are summoned. Exhaustion resets at the start of their controller's next turn.
- D3: **Spawn pattern** — Units spawn on unoccupied tiles adjacent to any friendly unit (8-way/Chebyshev 1). If no adjacent tile is free, spawn on any unoccupied tile within 2 tiles of a friendly unit. If still none, the card cannot be played (insufficient space).
- D4: **Minion control** — Spawned units are controlled by the player who played the Summon card. They act on that player's turn. Minions use their own move/attack stats (not the hero's).
- D5: **Minion AI for enemy summons** — When the enemy plays a Summon card, spawned minions follow the same multi-unit AI as the enemy (see `wiki:specs:enemy-system-deck-ai-difficulty`).
- D6: **Minion limits** — No hard cap on total units per side (beyond grid space). Practically limited by the 9×5 grid (45 tiles) and friendly units blocking each other.

## Requirements

### Functional Requirements

- FR-1: SummonData on a CardDef contains: `unit_template: GridUnitTemplate` (hp, max_hp, atk, move_points, max_moves, attack_range, max_attacks), `spawn_tag: SpawnTag`, `duration: Option<i32>` (None = permanent, Some(N) = lasts N turns then dies).
- FR-2: SpawnTag enum: Adjacent (spawn on a tile 8-way adjacent to the caster), Nearby (spawn on a tile within 3 tiles of caster), AnyFriendly (spawn on any unoccupied tile adjacent to any friendly unit).
- FR-3: Playing a Summon card: pay mana → choose valid spawn location → instantiate unit on grid → card goes to graveyard.
- FR-4: Valid spawn locations are computed at time of card play: scan all unoccupied tiles within spawn pattern distance of valid friendly units.
- FR-5: Spawned unit enters play with summoning sickness: `moves_made = max_moves`, `attacks_made = max_attacks`, `exhausted = true`. Flags reset at start of next player turn.
- FR-6: Duration-limited units (e.g., "Lasts 3 turns") decrement a `turns_remaining` counter at end of controller's turn. When it reaches 0, the unit is removed from the grid.
- FR-7: Minion benefits from keywords (see `wiki:specs:keyword-system`) — a summon's GridUnitTemplate can include keyword flags.
- FR-8: Minion death is handled identically to hero/enemy death — HP ≤ 0 → alive = false → removed from grid.
- FR-9: Hero cannot be displaced, replaced, or targeted by friendly-fire from own minions (minion attacks only target enemies).
- FR-10: Enemy summons: enemy AI evaluates Summon cards using the same priority system (see `enemy-system-deck-ai-difficulty` FR-5). Spawning location is chosen by the AI to maximize tactical value.

### Non-Functional Requirements

- NFR-1: Summon logic is pure Rust (zero Godot deps), unit-testable.
- NFR-2: Spawn location computation must complete in < 1ms.
- NFR-3: Duration-counter minions auto-remove at end of turn (no expensive scanning needed).

## Acceptance Criteria

- [ ] AC-1: Summon card has a unit_template defining HP, ATK, move_points, attack_range
- [ ] AC-2: Playing Summon shows valid spawn tiles highlighted on the grid
- [ ] AC-3: Clicking a valid spawn tile places the unit on the grid
- [ ] AC-4: Spawned unit has summoning sickness (cannot move or attack on summon turn)
- [ ] AC-5: Summoning sickness clears at the start of the next player turn
- [ ] AC-6: Adjacent spawn pattern: unit appears on any free tile 8-adjacent to caster
- [ ] AC-7: Nearby spawn pattern: unit within 3 tiles of caster
- [ ] AC-8: AnyFriendly spawn: unit adjacent to any friendly unit
- [ ] AC-9: If no valid spawn location exists, card play is rejected with a "No space" error
- [ ] AC-10: Duration-limited minion is removed after N turns
- [ ] AC-11: Minion attacks enemies correctly using its own stats
- [ ] AC-12: Minion dies, is removed from grid, triggers death effects
- [ ] AC-13: Enemy Summon card played by AI spawns a unit correctly
- [ ] AC-14: Enemy summoned minion acts on the enemy's turn with multi-unit AI
- [ ] AC-15: All existing tests plus new summon-specific tests pass with `cargo test`

## Scenarios

### Scenario 1: Player Summons a Minion
**Given** the player has a "Summon Pufferfish" card costing 2 mana
**When** they play it
**Then** valid spawn tiles (adjacent to hero, 8-way) are highlighted on the grid
**When** they click a valid tile
**Then** a Pufferfish unit (4 HP, 1 ATK) appears on that tile
**Then** the Pufferfish is exhausted (cannot move/attack this turn)
**Then** 2 mana is deducted
**Then** the Summon card moves to graveyard

### Scenario 2: Minion Acts Next Turn
**Given** a Pufferfish was summoned last turn (summoning sickness cleared)
**When** the player's turn starts
**Then** the Pufferfish's exhaustion is cleared
**Then** the player can move the Pufferfish and attack with it

### Scenario 3: Duration Minion Expires
**Given** a "Summon Phantom Fish" card with duration = 2
**When** the Phantom Fish is summoned on turn 3
**Then** it has `turns_remaining = 2`
**When** turn 4 starts (player turn)
**Then** `turns_remaining = 1`
**When** turn 5 starts
**Then** `turns_remaining = 0`
**Then** the Phantom Fish is removed from the grid at the start of turn 5

### Scenario 4: No Space for Summon
**Given** all tiles adjacent to the hero are occupied
**When** the player tries to play a Summon card with SpawnTag::Adjacent
**Then** the card play is rejected
**Then** the card stays in hand
**Then** mana is not deducted

### Scenario 5: Enemy Summons
**Given** the enemy has a Summon card in hand with enough mana
**When** the enemy turn runs
**Then** the AI plays the Summon card
**Then** a minion appears adjacent to the enemy unit
**Then** the minion has summoning sickness (cannot act this turn)
**Then** on the next enemy turn, the minion moves and attacks per multi-unit AI

## Technical Notes

- SummonData added to CardDef: `summon: Option<SummonData>`. CardDef gains a helper `is_summon() -> bool`.
- GridUnitTemplate: lightweight struct (hp, atk, move_points, attack_range, keywords: Vec<Keyword>) that the summon card carries. The bridge instantiates a new GridUnit from this template.
- Spawn logic: new function `fn find_spawn_tiles(state: &BattleState, caster_pos, spawn_tag: SpawnTag) -> Vec<GridCoord>` in `rust/src/core/battle/service/spawn.rs`.
- Summoning sickness: GridUnit's `moves_made`/`attacks_made` initialized to `max_moves`/`max_attacks` on creation. `reset_turn()` in `engine.rs` resets both to 0.
- Duration: GridUnit gains `turns_remaining: Option<i32>`. `end_turn()` in engine checks all units and decrements then removes any with `turns_remaining == 0`.
- The existing effect system handles summon card effects: the card effect creates the unit on the grid instead of dealing damage/healing.
- Valid spawn tile visualization: reused from the move-overlay/damage-overlay system in the gdext bridge.
- Minion AI: existing `decide_all()` in `enemy-system` AI already handles multiple units — minions controlled by the player have their own simple AI (click-to-attack in player's turn) OR they act automatically (follow nearest enemy). Phase 1: player controls minions directly via click (same as hero). Phase 2: auto-attack AI for player minions.

## Open Questions

- [ ] OQ-1: **(RESOLVED)** Should the player control minions directly or auto-pilot? → Phase 1: direct control (click minion → move/attack same as hero). Phase 2: consider auto-attack toggle.
- [ ] OQ-2: **(RESOLVED)** Duration minions die at start or end of controller's turn? → Start of controller's turn (so they get one final action window).
- [ ] OQ-3: How many Summon cards in the starter deck? → Propose 2: "Summon Pufferfish" (1 mana, 3/1, Adjacent, Common) and "Summon Angler" (2 mana, 4/2, Nearby, Uncommon).
- [ ] OQ-4: Can summon cards target enemy side? → No, summons always spawn on the caster's side of the field.