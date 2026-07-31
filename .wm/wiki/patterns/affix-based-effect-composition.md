---
{}
relates_to:
  - {type: relates_to, target: wiki:concepts:untested-ui-orchestration-p0s}
---

---
{}
relates_to:
  - {type: references, target: wiki:tasks:crafting-ui-actions}
---

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

## Critical Pitfall: "Applied at resolution time" Must Mean an Actual Call Site

The "affixes are applied when computing the effective effect values" line above describes the *intended* design — `apply_affixes_to_effects(card: &CardDef) -> Vec<CardEffect>` composes the base effects with affix/implicit bonuses correctly and is unit-tested for it. But for a full implementation pass, that function shipped `#[allow(dead_code)]` because **the battle bridge never called it** — both card-play paths in `battle_scene.rs` read `card.effects.clone()` directly, bypassing the affix layer entirely. Crafted cards spent gold, updated their `affixes` vec, and displayed the new affix text correctly, but hit/healed/shielded for exactly the base (un-modified) values in actual combat.

This is the resolution-time composition pattern's biggest risk: because the base `CardEffect`s and the affix-modified `CardEffect`s have the identical type, it's trivially easy for a call site to use the wrong one and still compile, still pass unit tests (which test `apply_affixes_to_effects` directly), and show no visible symptom outside of "the number in combat doesn't match the number in the crafting UI."

**Mitigation:** Treat `apply_affixes_to_effects` (or whatever function performs the composition) as the *only* legal way to read a card's effects for gameplay purposes — never `card.effects` directly — everywhere except pure display/description code (range/target lookups, which affixes don't change, are fine to read from `card.effects` directly). Grep for `.effects.clone()` and `.effects.iter()` at bridge call sites whenever the affix system changes, and add an integration test that plays a crafted card and asserts the boosted value landed. See @wiki/concepts/untested-ui-orchestration-p0s (third occurrence) for the full failure writeup and fix.

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
- @wiki/concepts/untested-ui-orchestration-p0s