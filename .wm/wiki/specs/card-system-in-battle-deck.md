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

Implement the card data model, in-battle hand/deck management, and basic card play for the tactical RPG combat system. Cards are effects-first (no attack/defense stats), use Duelyst-style draw/replace, and resolve effects against grid units.

## Locked Decisions

- D6: **Duelyst-style draw** — Draw 1 at end of turn. Hand max 5. Replace 1/turn (shuffle 1 back, draw random).
- D7: **Effects-first card model** — Cards have name, cost, effects list (type, target, value), rarity. No attack/defense stats.
- D8: **First implementation scope** — CardDef + Effect models, hand management (draw, discard, hand size limit, Replace), mana spending, and basic card play that resolves effects against grid units.
- D9: **Shared card system** — Same CardDef, hand, deck, and effect resolution used by both player and enemy. Any card can appear on either side.

## Requirements

### Functional Requirements

- FR-1: CardDef contains: id, name, cost (1-9), effects (Vec<Effect>), rarity (Rarity enum)
- FR-2: Effect is an enum with variants: Damage(i32), Heal(i32), Shield(i32), DrawCards(i32), ApplyBuff(BuffType, i32)
- FR-2a: BuffType enum: Blind (next attack deals 50% less), Strengthen (+2 damage on attacks, N turns)
- FR-2b: CardEffect struct contains: effect (Effect variant), range (i32), aoe (i32)
- FR-3: Rarity enum: Common, Uncommon, Rare, Legendary
- FR-4: Hand management: max 5 cards, draw from deck, discard to graveyard
- FR-5: Draw 1 card at end of player turn (if deck empty, shuffle graveyard back)
- FR-6: Replace 1/turn: select a card from hand, shuffle it into deck, draw 1 random
- FR-7: Play a card from hand: check mana cost, deduct mana, resolve effects, move to graveyard
- FR-8: Card effects use Range + AoE system. Range = tiles from caster the effect can reach. AoE = cross-shaped blast area centered on target tile. AoE 1 = target tile only, AoE 2 = target + 4 cardinal adjacent, AoE 3 = target + 4 cardinal arms of length 2.
- FR-8a: Effect resolution handles AoE: all units in the blast area receive the effect
- FR-8b: Shield stacks additively and expires at the start of the bearer's next turn
- FR-9: Deck of 25-30 cards shuffled at battle start, dealt into hand of 5
- FR-10: Graveyard: cards that have been played or discarded. Shuffled back when deck is empty.
- FR-11: Enemy also has a hand + deck using the same CardDef system. Enemy draws from its own deck.
- FR-12: Enemy plays cards from its hand during its turn, following the same mana/effect resolution rules.
- FR-13: Enemy AI decides which card to play based on simple priority (highest-damage affordable card first).

### Non-Functional Requirements

- NFR-1: All card logic is pure Rust (zero Godot deps), unit-testable
- NFR-2: Effect resolution is deterministic (same seed → same outcome)
- NFR-3: Mana check prevents playing cards when insufficient mana

## Acceptance Criteria

- [ ] AC-1: CardDef can be constructed with name, cost, effects, rarity
- [ ] AC-2: Hand holds max 5 cards, drawing beyond limit discards
- [ ] AC-3: Draw 1 card at end of player turn
- [ ] AC-4: Replace 1/turn: selected card shuffled back, random card drawn
- [ ] AC-5: Playing a card deducts mana, resolves effects, moves to graveyard
- [ ] AC-6: Insufficient mana prevents card play
- [ ] AC-7: Damage effect with range check: only in-range targets can be selected
- [ ] AC-7a: Damage effect reduces target unit HP
- [ ] AC-7b: Damage with AoE > 1 affects all units in cross-shaped blast area
- [ ] AC-8: Heal effect restores target unit HP (not above max)
- [ ] AC-9: Shield effect grants temporary HP on target unit, stacks with existing shield
- [ ] AC-9a: Shield expires at the start of the bearer's next turn
- [ ] AC-10: Deck of 25-30 cards shuffled at battle start, 5 dealt to hand
- [ ] AC-11: Empty deck shuffles graveyard back automatically
- [ ] AC-12: Enemy has its own hand + deck, draws 1 card at end of enemy turn
- [ ] AC-13: Enemy AI plays a card from hand when it has sufficient mana and a valid target
- [ ] AC-14: Enemy card effects resolve through the same system as player cards
- [ ] AC-15: All tests pass with `cargo test`

## Scenarios

### Scenario 1: Draw at End of Turn
**Given** the player has 3 cards in hand, 20 cards in deck
**When** the player ends their turn
**Then** 1 card is drawn from deck
**Then** hand now has 4 cards

### Scenario 2: Replace Mechanic
**Given** the player has 5 cards in hand
**When** they use Replace on card at index 2
**Then** card at index 2 is shuffled into deck
**Then** 1 random card is drawn from deck
**Then** hand still has 5 cards

### Scenario 3: Play Card with Damage
**Given** the player has a card costing 2 mana with Damage(5) effect
**When** they play it targeting an enemy with 10 HP
**Then** 2 mana is deducted from player's mana pool
**Then** the enemy HP is reduced to 5
**Then** the card is moved to graveyard

### Scenario 4: Insufficient Mana
**Given** the player has 1 mana and a card costing 3 mana
**When** they attempt to play the card
**Then** the play is rejected
**Then** mana remains 1
**Then** card stays in hand

### Scenario 5: Empty Deck Reshuffles
**Given** the player has 1 card in deck, 5 cards in graveyard
**When** they draw the last card
**Then** deck is now empty
**When** they need to draw again (end turn)
**Then** graveyard is shuffled into deck
**Then** 1 card is drawn from the new deck
**Then** graveyard is now empty

## Starter Deck — Guppy the Debtor

26 cards (13 unique × 2 copies each), effects-first model:

| # | Card | Cost | Effects | Range | AoE | Rarity | Role |
|---|------|------|---------|-------|-----|--------|------|
| 1 | Fin Slash | 1 | Damage 3 | 1 | 1 | Common | Basic melee |
| 2 | Splash | 0 | Damage 1 | 1 | 1 | Common | Free poke |
| 3 | Bubble Shield | 1 | Shield 4 | 0 | 1 | Common | Self-shield |
| 4 | Quick Swim | 1 | DrawCards 2 | 0 | 1 | Common | Card draw |
| 5 | Deep Breath | 0 | Heal 2 | 0 | 1 | Common | Free heal |
| 6 | Scale Throw | 1 | Damage 2 | 3 | 1 | Common | Ranged poke |
| 7 | Tail Slap | 2 | Damage 5 | 1 | 1 | Uncommon | Heavy melee |
| 8 | Ink Jet | 1 | Damage 2 + Blind 1 | 2 | 2 | Uncommon | Debuff cross |
| 9 | Coral Shell | 2 | Shield 6 | 0 | 1 | Uncommon | Strong shield |
| 10 | Healing Rain | 2 | Heal 3 | 2 | 2 | Uncommon | AoE heal cross |
| 11 | Tidal Wave | 3 | Damage 4 | 3 | 3 | Rare | Long AoE cross |
| 12 | Siren's Call | 1 | Strengthen 2 | 0 | 1 | Rare | Self-buff |
| 13 | Desperate Strike | 3 | Damage 8 | 1 | 1 | Rare | Big hit |

**Buff definitions:**
- **Blind** (1 turn): Target's next attack deals 50% less damage
- **Strengthen** (2 turns): Target deals +2 damage on attacks

- Card system lives in `rust/src/core/cards/` as a new module
- Hand, Deck, Graveyard are separate structs under `rust/src/core/battle/model/`
- BattleState gains hand, deck, graveyard, replace_used (bool) fields
- Effect resolution is a function `resolve_effect(effect: &Effect, target: &mut GridUnit, context: &BattleState)`
- Draw/Replace/Play are functions in `rust/src/core/battle/service/card_actions.rs`
- Mana is deducted from BattleState.mana
- Replace is tracked per-turn via `replace_used` flag, reset on turn start

## Open Questions

- [ ] OQ-3: **(RESOLVED)** Shield stacks additively, expires at start of bearer's next turn.
- [ ] OQ-4: **(RESOLVED)** Range + AoE targeting. Cross-shaped blast. AoE 1 = single tile, AoE 2 = cross radius 1, AoE 3 = cross radius 2.
- [ ] OQ-1: **(RESOLVED)** Card play is free — move, attack, AND play cards in same turn. Mana is the only constraint.
- [ ] OQ-2: **(RESOLVED)** Starter deck designed above (13 unique × 2 copies = 26 cards).