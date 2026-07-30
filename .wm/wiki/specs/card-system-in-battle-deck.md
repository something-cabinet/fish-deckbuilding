---
title: Card System — In-Battle Hand, Deck, and Play
type: spec
tags: [game-design, cards, combat, rust]
status: approved
---

---
title: Card System — In-Battle Hand, Deck, and Play
type: spec
status: approved
tags:
- game-design
- cards
- combat
- rust
---

## Overview

Implement the card data model, in-battle hand/deck management, and basic card play for the tactical RPG combat system. Cards are effects-first (no attack/defense stats), use Duelyst-style draw/replace, and resolve effects against grid units. Updated to include mana ramping (+1/turn), mulligan (2-card pre-battle replace), and a unified Range + TargetFilter targeting system shared with unit combat.

## Locked Decisions

- D6: **Duelyst-style draw** — Draw 1 at end of turn. Hand max 5. Replace 1/turn (shuffle 1 back, draw random).
- D7: **Effects-first card model** — Cards have name, cost, effects list (type, target, value), rarity. No attack/defense stats.
- D8: **First implementation scope** — CardDef + Effect models, hand management (draw, discard, hand size limit, Replace), mana spending, and basic card play that resolves effects against grid units.
- D9: **Shared card system** — Same CardDef, hand, deck, and effect resolution used by both player and enemy. Any card can appear on either side.
- D10: **Mana ramping** — Mana = +1 per turn, starting at 1, max 9. Player starts with 1 mana on turn 1, gains +1 each subsequent turn up to 9. This replaces the Phase 1 display-only 3-mana system.
- D11: **Mulligan** — Before the first turn, player selects up to 2 cards from their starting hand to replace. Selected cards are shuffled into the deck, same number drawn back. One-time at battle start.
- D12: **Unified Range enum** — `Range { Melee, Ranged }` is shared between unit base attacks and card effects. `Range::Melee` = Chebyshev distance 1 (8-way adjacent tiles). `Range::Ranged` = any tile on the board. A "melee spell" uses `Range::Melee` and can only target adjacent tiles. A "ranged spell" uses `Range::Ranged` and can target any tile.
- D13: **TargetFilter enum** — Cards use Duelyst-style filter-based targeting: `TargetFilter { EnemyUnit, AllyUnit, AnyUnit, EmptyTile, AnyTile, Self }`. Combined with `Range`, this determines valid play positions. `Range` answers "how far?", `TargetFilter` answers "what can I hit?"

## Requirements

### Functional Requirements

- FR-1: CardDef contains: id, name, cost (1-9), effects (Vec<CardEffect>), rarity (Rarity enum)
- FR-2: Effect is an enum with variants: Damage(i32), Heal(i32), Shield(i32), DrawCards(i32), ApplyBuff(BuffType, i32)
- FR-2a: BuffType enum: Blind (next attack deals 50% less), Strengthen (+2 damage on attacks, N turns)
- FR-2b: CardEffect struct contains: `effect: Effect`, `range: Range`, `target: TargetFilter`, `affect_pattern: Vec<(i32, i32)>`
- FR-2c: **Range enum** — shared with unit combat:
  ```rust
  enum Range {
      Melee,  // Chebyshev distance 1 (8-way adjacent)
      Ranged, // Any tile on the board
  }
  ```
- FR-2d: **TargetFilter enum** — Duelyst-style:
  ```rust
  enum TargetFilter {
      EnemyUnit,  // Must target an enemy unit
      AllyUnit,   // Must target an allied unit
      AnyUnit,    // Can target any unit
      EmptyTile,  // Must target an empty tile (summon placement)
      AnyTile,    // Any tile on the board (AoE placement)
      Self,       // Only the casting unit (buffs, shields)
  }
  ```
- FR-2e: **Affect pattern** — Duelyst-style offset list. `affect_pattern: Vec<(i32, i32)>` defines the blast area as explicit (dx, dy) offsets from the target tile. The target tile itself is always included. Empty vec = target tile only. Pre-defined constants for common patterns:
  ```rust
  mod patterns {
      use crate::grid::GridCoord;
      pub const SINGLE: &[(i32, i32)] = &[];
      pub const CROSS: &[(i32, i32)] = &[(-1,0), (0,-1), (0,0), (0,1), (1,0)];
      pub const SQUARE_3X3: &[(i32, i32)] = &[
          (-1,-1), (0,-1), (1,-1),
          (-1, 0), (0, 0), (1, 0),
          (-1, 1), (0, 1), (1, 1)];
      pub const SQUARE_2X2: &[(i32, i32)] = &[(0,0), (1,0), (0,1), (1,1)];
      pub const DIAMOND_3: &[(i32, i32)] = &[ /* Manhattan ≤ 2 + center */ ];
      pub const ROW: &[(i32, i32)] = &[(-4,0),(-3,0),(-2,0),(-1,0),(0,0),(1,0),(2,0),(3,0),(4,0)];
  }
  ```
  Any shape is expressible — zero new code per shape. New patterns are just new constants.
- FR-3: Rarity enum: Common, Uncommon, Rare, Legendary
- FR-4: Hand management: max 5 cards, draw from deck, discard to graveyard
- FR-5: Draw 1 card at end of player turn (if deck empty, shuffle graveyard back)
- FR-6: Replace 1/turn: select a card from hand, shuffle it into deck, draw 1 random
- FR-7: Play a card from hand: check mana cost → compute valid targets via `fn valid_targets(card, caster, state) -> Vec<GridCoord>` → player picks → deduct mana → resolve effects → move to graveyard.
- FR-7a: `valid_targets()` is the single source of truth for both UI highlighting AND play validation. Bridge calls core → core returns valid tiles → bridge renders overlay → bridge sends click → core validates click is in valid set. Prevents UI/logic drift.
- FR-8: Target resolution two-stage pipeline (Duelyst-style):
  - **Stage 1 — Range filter**: filter all board tiles by `Range`. `Melee` = tiles within Chebyshev 1 of caster. `Ranged` = all tiles.
  - **Stage 2 — Target filter**: filter remaining tiles by `TargetFilter`. `EnemyUnit` = tiles occupied by enemy units only. `AnyTile` = all tiles pass. `Self` = caster's tile only.
- FR-8a: After target is confirmed, the affect pattern expands from the chosen tile: `affect_pattern.iter().map(|(dx, dy)| (target.x + dx, target.y + dy))`. The target tile is always included (offset (0,0) added if not in pattern). Edge semantics (Duelyst-style): if any offset falls outside the board, the target tile is rejected — the entire pattern must fit on the board.
- FR-8b: Effect resolution handles AoE: all units in the blast area receive the effect.
- FR-8c: Shield stacks additively and expires at the start of the bearer's next turn.
- FR-9: Deck of 25-30 cards shuffled at battle start, dealt into hand of 5
- FR-10: Graveyard: cards that have been played or discarded. Shuffled back when deck is empty.
- FR-11: Enemy also has a hand + deck using the same CardDef system. Enemy draws from its own deck.
- FR-12: Enemy plays cards from its hand during its turn, following the same mana/effect resolution rules.
- FR-13: Enemy AI decides which card to play based on simple priority (highest-damage affordable card first).
- FR-14: **Mana ramping** — Player's `max_mana` starts at 1, increments by 1 at the start of each player turn, caps at 9. `current_mana` is reset to `max_mana` at the start of each player turn.
- FR-15: **Mulligan** — At battle start, after initial 5-card draw, player may select 0-2 cards to replace. Selected cards are shuffled into the deck. An equal number of cards are drawn from the deck. Mulligan happens before turn 1.
- FR-16: **Mana spring interaction** — (See `wiki:specs:godot-battle-scaffold`) Stepping on a mana spring tile increases max_mana by 1 (once per spring per battle), up to cap.
- FR-17: **Mana display** — HUD shows `current_mana / max_mana`. Mana gems/bubbles (Duelyst-style) display each point visually. Unspent mana is lost at end of turn (not saved).

### Non-Functional Requirements

- NFR-1: All card logic is pure Rust (zero Godot deps), unit-testable
- NFR-2: Effect resolution is deterministic (same seed → same outcome)
- NFR-3: Mana check prevents playing cards when insufficient mana
- NFR-4: `valid_targets()` must complete in < 1ms (simple range + filter on 9×5 grid)

## Acceptance Criteria

- [ ] AC-1: `Range` enum defined with `Melee` and `Ranged` variants
- [ ] AC-2: `TargetFilter` enum defined with 6 variants
- [ ] AC-3: `affect_pattern: Vec<(i32, i32)>` replaces the AoE enum — any shape is an offset list
- [ ] AC-4: CardDef can be constructed with name, cost, effects, rarity
- [ ] AC-5: CardEffect uses `Range`, `TargetFilter`, `AoE` instead of numeric `range`
- [ ] AC-6: `valid_targets()` with `Range::Melee` returns only tiles within Chebyshev 1 of caster
- [ ] AC-7: `valid_targets()` with `Range::Ranged` returns all unblocked board tiles
- [ ] AC-8: `valid_targets()` with `TargetFilter::EnemyUnit` returns only enemy-occupied tiles
- [ ] AC-9: `valid_targets()` with `TargetFilter::EmptyTile` returns only unoccupied tiles
- [ ] AC-10: `valid_targets()` with `TargetFilter::Self` returns only caster's position
- [ ] AC-11: Hand holds max 5 cards, drawing beyond limit discards
- [ ] AC-12: Draw 1 card at end of player turn
- [ ] AC-13: Replace 1/turn: selected card shuffled back, random card drawn
- [ ] AC-14: Playing a card deducts mana, resolves effects, moves to graveyard
- [ ] AC-15: Insufficient mana prevents card play
- [ ] AC-16: Damage effect reduces target unit HP
- [ ] AC-17: Damage with `patterns::CROSS` affects target + 4 cardinal tiles
- [ ] AC-18: Damage with `patterns::SQUARE_3X3` affects all 9 tiles in 3×3 box around target
- [ ] AC-19: Heal effect restores target unit HP (not above max)
- [ ] AC-20: Shield effect grants temporary HP, stacks additively
- [ ] AC-21: Shield expires at the start of the bearer's next turn
- [ ] AC-22: Deck of 25-30 cards shuffled at battle start, 5 dealt to hand
- [ ] AC-23: Empty deck shuffles graveyard back automatically
- [ ] AC-24: Enemy has its own hand + deck, draws 1 card at end of enemy turn
- [ ] AC-25: Enemy AI plays a card from hand when it has sufficient mana and valid target
- [ ] AC-26: All tests pass with `cargo test`
- [ ] AC-27: `valid_targets()` is the single function called by both bridge overlay and play validator
- [ ] AC-28: `max_mana` starts at 1 on turn 1, increments by 1 each turn, caps at 9
- [ ] AC-29: `current_mana` resets to `max_mana` at start of each player turn
- [ ] AC-30: Unspent mana is lost at end of turn
- [ ] AC-31: Mulligan lets player select 0-2 cards to replace before turn 1
- [ ] AC-32: Mulligan replaced cards shuffled back, equal number drawn
- [ ] AC-33: Mana spring increases max_mana by 1 (once per spring per battle, subject to cap)
- [ ] AC-34: Mana HUD shows correct `current_mana / max_mana`

## Scenarios

### Scenario 1: Play Melee Damage Card
**Given** the player has "Fin Slash" (cost 1, Damage 3, Range::Melee, TargetFilter::EnemyUnit, AoE::Single)
**When** they select the card
**Then** only adjacent enemy-occupied tiles are highlighted
**When** they click an adjacent enemy
**Then** 1 mana deducted, enemy takes 3 damage, card goes to graveyard

### Scenario 2: Play Ranged Damage Card
**Given** the player has "Scale Throw" (cost 1, Damage 2, Range::Ranged, TargetFilter::EnemyUnit, AoE::Single)
**When** they select the card
**Then** ALL enemy-occupied tiles on the board are highlighted
**When** they click an enemy 5 tiles away
**Then** 1 mana deducted, enemy takes 2 damage

### Scenario 3: Play AoE Cross Card
**Given** the player has "Ink Jet" (cost 1, Damage 2 + Blind, Range::Ranged, TargetFilter::AnyTile, AoE::Cross(1))
**When** they select the card
**Then** all tiles on the board are highlighted
**When** they click a tile with 2 enemies in cardinal positions
**Then** both enemies take 2 damage and receive Blind

### Scenario 4: Play Self-target Card
**Given** the player has "Bubble Shield" (cost 1, Shield 4, Range::Melee, TargetFilter::Self, AoE::Single)
**When** they select the card
**Then** only the hero's tile is highlighted
**When** they click it
**Then** hero gains 4 shield, card goes to graveyard

### Scenario 5: Play Heal on Ally
**Given** the player has "Healing Rain" (cost 2, Heal 3, Range::Ranged, TargetFilter::AllyUnit, AoE::Single)
**When** they select the card
**Then** all friendly units' tiles are highlighted
**When** they click a damaged friendly unit
**Then** that unit heals 3 HP

## Starter Deck — Guppy the Debtor

26 cards (13 unique × 2 copies each), updated to use Range + TargetFilter:

| # | Card | Cost | Effects | Range | Target | AoE | Rarity |
|---|------|------|---------|-------|--------|-----|--------|
| 1 | Fin Slash | 1 | Damage 3 | Melee | EnemyUnit | Single | Common |
| 2 | Splash | 0 | Damage 1 | Melee | EnemyUnit | Single | Common |
| 3 | Bubble Shield | 1 | Shield 4 | Melee | Self | Single | Common |
| 4 | Quick Swim | 1 | DrawCards 2 | Melee | Self | Single | Common |
| 5 | Deep Breath | 0 | Heal 2 | Melee | Self | Single | Common |
| 6 | Scale Throw | 1 | Damage 2 | Ranged | EnemyUnit | Single | Common |
| 7 | Tail Slap | 2 | Damage 5 | Melee | EnemyUnit | Single | Uncommon |
| 8 | Ink Jet | 1 | Damage 2 + Blind | Ranged | AnyTile | Cross(1) | Uncommon |
| 9 | Coral Shell | 2 | Shield 6 | Melee | Self | Single | Uncommon |
| 10 | Healing Rain | 2 | Heal 3 | Ranged | AllyUnit | Cross(1) | Uncommon |
| 11 | Tidal Wave | 3 | Damage 4 | Ranged | AnyTile | Cross(2) | Rare |
| 12 | Siren's Call | 1 | Strengthen 2 | Melee | Self | Single | Rare |
| 13 | Desperate Strike | 3 | Damage 8 | Melee | EnemyUnit | Single | Rare |

- Card system lives in `rust/src/core/cards/` — Range, TargetFilter, AffectPattern types defined here
- `fn valid_targets(card: &CardDef, caster: GridCoord, state: &BattleState) -> Vec<GridCoord>` — called by bridge for overlay AND by engine for play validation
- Hand, Deck, Graveyard under `rust/src/core/battle/model/`
- BattleState gains hand, deck, graveyard, replace_used, mulligan_used, turn_number
- Draw/Replace/Play in `rust/src/core/battle/service/card_actions.rs`

## Open Questions

- [ ] OQ-3: **(RESOLVED)** Shield stacks additively, expires at start of bearer's next turn.
- [ ] OQ-4: **(RESOLVED)** Range + AoE targeting replaced by unified Range enum + TargetFilter + affect_pattern offset list.
- [ ] OQ-1: **(RESOLVED)** Card play is free — move, attack, AND play cards in same turn. Mana is the only constraint.
- [ ] OQ-2: **(RESOLVED)** Starter deck designed above (13 unique × 2 copies = 26 cards).
- [ ] OQ-5: **(RESOLVED)** Mana ramping (+1/turn, start at 1, max 9).
- [ ] OQ-6: **(RESOLVED)** Mulligan (2-card replace pre-turn-1) reduces early RNG.
- [ ] OQ-7: **(RESOLVED)** Unified Range enum shared between cards and unit base attacks.
- [ ] OQ-8: **(RESOLVED)** TargetFilter replaces numeric range for cards, following Duelyst's model.
- [ ] OQ-9: **(RESOLVED)** `valid_targets()` is the single source of truth for UI + validation.