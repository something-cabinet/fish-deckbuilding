---
title: Combat Affix & Crafting System
type: spec
status: implemented
tags:
- game-design
- combat
- affix
- crafting
- cards
---

## Overview

Enhance the combat system with Diablo-style affix lines on cards, a stash system for deck management between fights, NPC crafting mechanics (reroll, add slot, corrupt), and character-specific unique cards. Inspired by Inkbound and Path of Exile.

> **Note:** Per the approved card-crafting-ui spec, Enchanter = add slot (100g), Gambler = reroll affix (50g). This was swapped from the original draft via commit `c5d8644`.

## Locked Decisions

- D1: **Rarity-based affix slots** — Common (0), Uncommon (1), Rare (2), Legendary (3). Affixes either enhance the card's base effect (stats) or add new effects.
- D2: **Between-fight deckbuilding** — After each combat encounter, freely swap cards between the 10-card combat deck and 30-card stash.
- D3: **Full crafting system** — Multiple mechanics: reroll affix, add affix slot, corrupt (Vaal-style — finalizes card, blocks further modification, random outcomes with risk/reward), and others via Enchanter + Gambler NPCs.
- D4: **Character-unique cards** — Multiple characters, each with 3 unique cards forced into their combat deck. Non-transferable.
- D5: **Semi-constrained affix generation** — 80% in-type (matches card type tag), 20% off-type (allows cross-synergies between affixes on same card). Infinite loops must be prevented in effect resolution.

## Requirements

### Functional Requirements

- FR-1: Cards have a base effect plus 0-3 affix slots determined by rarity
- FR-2: Affixes can enhance the base effect (stat bonuses) or add new effects
- FR-3: Players manage a 10-card combat deck + 30-card stash, swappable between encounters
- FR-4: Enchanter NPC allows adding a random affix slot to a card below max slots for gold
- FR-5: Gambler NPC allows rerolling a single affix on a card for gold
- FR-6: Corrupt mechanic (Vaal-style) — applies a random outcome from a weighted pool on use:

  | Outcome | Weight | Effect |
  |---------|--------|--------|
  | No change | 20% | Card is corrupted, affixes unchanged |
  | Boost | 15% | All affix values increased by 25-50% |
  | Weaken | 10% | All affix values decreased by 25-50% |
  | Reroll affixes | 25% | All affixes replaced with new random ones |
  | Add corruption implicit | 20% | Card gains a special corruption-only affix (unique, powerful) |
  | Add+corrupt | 10% | Card gains a corruption implicit AND one existing affix gets boosted |

  After corruption, card is locked — no further crafting allowed. The risk of "bricking" (weaken or bad reroll) creates the tension.
- FR-6a: Corruption-only affixes ("implicits") exist — these are powerful, unique effects that can only appear through corruption. They occupy a separate slot from regular affixes.
- FR-6b: Corrupted cards are visually distinct (red border, cracked frame effect).
- FR-7: Each character has 3 unique cards that are forced into their combat deck (cannot be stashed or transferred)
- FR-8: Affix generation is semi-constrained — 80% in-type, 20% off-type
- FR-9: Effect resolution system prevents infinite loops from cross-affix synergies

### Non-Functional Requirements

- NFR-1: Affix generation must be deterministic from seed (roguelike fairness)
- NFR-2: Crafting costs must be balanced so players can't endlessly reroll without meaningful choices
- NFR-3: Infinite loop detection must be performant (< 1ms per effect resolution)

## Acceptance Criteria

- [ ] AC-1: Cards display correct number of affix slots based on rarity
- [ ] AC-2: Affixes are generated with 80/20 type distribution
- [ ] AC-3: Player can swap cards between combat deck and stash between encounters
- [ ] AC-4: Enchanter can reroll a single affix, costing gold
- [ ] AC-5: Gambler can add a slot to a card below max, costing gold
- [ ] AC-6: Corrupted card shows visual indicator, corruption outcome is applied, no further modifications allowed
- [ ] AC-6a: Corruption-only implicit affixes exist and are distinct from regular affixes
- [ ] AC-6b: Each corruption outcome has the correct weight from the pool
- [ ] AC-7: Each character's 3 unique cards are forced into combat deck
- [ ] AC-8: Effect resolution terminates without infinite loops for any combination of affixes
- [ ] AC-9: Same seed produces same affix rolls

## Scenarios

### Scenario 1: Between-Fight Deckbuilding
**Given** the player has just won a combat encounter
**When** they open the deck management screen
**Then** they can freely move cards between the 10-slot combat deck and 30-slot stash
**Then** the updated combat deck is saved for the next encounter

### Scenario 2: Gambler Reroll
**Given** the player has a Rare card with 2 affixes
**When** they visit the Gambler and pay gold to reroll a random affix
**Then** one random affix is replaced with a new random affix (semi-constrained)
**Then** the remaining affix remains unchanged

### Scenario 3: Corrupt Card — Boost Outcome
**Given** the player has a Rare card with "+3 ATK" and "+2 DEF" affixes
**When** they use the corrupt mechanic on it
**Then** the card is marked as corrupted (red visual)
**Then** the "Boost" outcome triggers: affix values increase by 30%
**Then** the card now reads "+4 ATK" and "+3 DEF"
**Then** no further crafting operations are allowed on that card

### Scenario 3b: Corrupt Card — Implicit Outcome
**Given** the player has a card with 2 affixes
**When** they use the corrupt mechanic on it
**Then** the "Add corruption implicit" outcome triggers
**Then** a special corruption-only affix is added (e.g., "Cannot be blocked")
**Then** the existing 2 affixes remain unchanged
**Then** no further crafting operations are allowed on that card

### Scenario 3c: Corrupt Card — Brick Outcome
**Given** the player has a well-rolled Rare card
**When** they use the corrupt mechanic on it
**Then** the "Weaken" outcome triggers: all affix values decreased by 40%
**Then** the card is now worse than before — the player feels the risk

### Scenario 4: Infinite Loop Prevention
**Given** a card has affix A ("reflect fire damage on block") and affix B ("+fire damage")
**When** the block action triggers both affixes
**Then** each affix resolves exactly once
**Then** no recursive trigger chain occurs

### Scenario 5: Character Unique Cards
**Given** the player is playing as Character X
**When** their combat deck is assembled
**Then** the 3 unique cards for Character X are automatically included and cannot be removed

## Technical Notes

- Affix generation uses a deterministic RNG seeded per-save/run
- Effect resolution uses a visited-set or depth-limit to prevent infinite loops
- Affix type tags: Offense, Defense, Utility — defined in a shared enum
- Unique cards are defined per-character in a data-driven format (JSON or similar)

## Research Findings

### Existing Characters
Only **Guppy the Debtor** exists (HP 30, base ATK 2, grid position (0,2)). No other character classes are defined. The "multiple characters" requirement (D4) will need new character design from scratch.

### Overworld & NPCs
No overworld is implemented. The tactical RPG spec (approved) targets a Cross Blitz-style island map with clickable destinations (towns, shops, battle zones). Enchanter and Gambler NPCs would be new additions to this blank canvas.

### Economy
Gold is the campaign-persistent currency (earned from battles, spent at shops). No gold amounts, prices, or balance are defined. The FaB coin system (per-turn, resets) is superseded — gold is the durable economy. Crafting costs can be designed freely.

### Card System
No card data model exists in Rust. The card system is greenfield. The affix spec can define its data model from scratch. AttackResult and GridUnit are the only combat primitives affix effects would interact with.

### Rust Architecture
Core logic lives in `rust/src/core/` (model/service split, zero Godot deps). The affix/crafting system would be new modules under `core/` (e.g., `cards/`, `affix/`, `crafting/`). The existing Run/Combat State Split pattern separates persistent state (deck, gold) from per-battle state (hand, draw pile).

## Implementation Notes

Implemented in commit `9e70ee6`:

| AC | Status | Notes |
|----|--------|-------|
| AC-1: Affix slots by rarity | ✅ | `Rarity::max_affixes()` — Common 0, Uncommon 1, Rare 2, Legendary 3 |
| AC-2: 80/20 type distribution | ✅ | `generate_affixes()` — 80% in-type, 20% off-type |
| AC-3: Deck/stash swapping | ✅ | Pre-existing (`swap_deck_stash`) |
| AC-4: Enchanter add slot | ✅ | `enchanter_add_slot()` — 100g cost |
| AC-5: Gambler reroll affix | ✅ | `gambler_reroll_affix()` — 50g cost |
| AC-6: Corrupted visual | ❌ | Not implemented |
| AC-6a: Implicit affixes | ✅ | 3 corruption-only implicits |
| AC-6b: Weighted outcomes | ✅ | 6 outcomes with correct weights |
| AC-7: Character unique cards | ❌ | Not implemented (only Guppy exists) |
| AC-8: Infinite loop prevention | ❌ | Not implemented (affects effect resolution) |
| AC-9: Deterministic seeds | ✅ | Same seed + same card = same result |

Open items tracked separately: corrupted visual indicators (FR-6b), character unique cards (D4/FR-7), infinite loop prevention (FR-9).

- [ ] **OQ-1: Gold costs** — What are the specific gold costs for each crafting operation? (No existing economy to balance against; costs can be placeholder values like 50/100/200 for reroll/add-slot/corrupt)
- [ ] **OQ-2: Character classes** — What additional characters exist beyond Guppy? (Greenfield — needs design work)
- [ ] **OQ-3: Reroll limit** — Should there be a limit on how many times an affix can be rerolled on a single card? (No existing constraint)
- [ ] **OQ-4: Corrupt effect** — **(RESOLVED via PoE2 Vaal system)** Corrupt outcomes are drawn from a weighted pool: boost values, weaken values, reroll affixes, add corruption implicit, or no change. The risk of bricking creates the gamble tension. Corruption-only implicit affixes exist as chase outcomes.
- [ ] **OQ-5: NPC placement** — How do Enchanter/Gambler NPCs fit into the overworld? (Overworld is blank canvas — could be shop nodes on the map)