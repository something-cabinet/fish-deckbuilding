---
title: Pattern: Affix-Based Effect Composition for Card Games
type: pattern
tags: [pattern, cards, affix, rust, game-design]
status: active
---

## Problem
Card games need a way to modify or enhance card effects after a card is created — through crafting, corruption, or loot systems. Adding new effect types for every possible modifier creates combinatorial explosion, and modifying the base card definition at runtime makes state management fragile.

## Solution
Model affixes as a separate data layer that composes with the card's base effects at resolution time. Each affix carries stat bonuses (damage, heal, shield, draw) that target a specific effect index on the card. The base card remains immutable; affixes are applied when computing the effective effect values.

```
CardDef {
    effects: Vec<CardEffect>,       // base effects (immutable)
    affixes: Vec<Affix>,            // modifiable affix layer
    corrupted: bool,
    implicit_affix: Option<Affix>,  // corruption-only slot
}

Affix {
    affix_type: AffixType,     // Offense / Defense / Utility
    target_effect_idx: usize,  // which effect this modifies
    damage_bonus: i32,
    heal_bonus: i32,
    shield_bonus: i32,
    draw_bonus: i32,
}
```

### Affix Slots by Rarity
- Common: 0 slots
- Uncommon: 1 slot
- Rare: 2 slots
- Legendary: 3 slots

### Affix Generation
- 80% in-type (affix type matches the card's base effect type)
- 20% off-type (random type, enabling cross-synergies)
- Deterministic from a seeded RNG per operation

### Crafting Operations
All operations are pure functions returning a new CardDef:
- **Enchanter reroll**: Replace one affix with a new random one
- **Gambler add slot**: Add a new affix if below max
- **Corrupt**: Apply a weighted random outcome, finalizes card

### Corruption Outcomes
| Outcome | Weight | Effect |
|---------|--------|--------|
| No change | 20% | Card is corrupted, affixes unchanged |
| Boost | 15% | All affix values +25-50% |
| Weaken | 10% | All affix values -25-50% |
| Reroll affixes | 25% | All affixes replaced |
| Add corruption implicit | 20% | Gains a special implicit affix |
| Add implicit + boost | 10% | Implicit + boosted existing affix |

## When to Use
- Card games with a crafting or loot system
- Games where cards need runtime modification without mutating base definitions
- Roguelite deckbuilders with persistent deck modification between runs

## When Not to Use
- Games where cards are static and never modified
- Simple card games where card effects are fixed at design time

## Known Variants
- **Implicit affixes**: Corruption-only affixes in a separate slot from regular affixes, similar to Path of Exile's implicit modifiers
- **Semi-constrained generation**: 80/20 distribution between in-type and off-type affixes to create planned synergies while allowing cross-synergy discovery

## Related
- @wiki/specs/combat-affix-crafting-system
- @wiki/patterns/effects-first-card-model