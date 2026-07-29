---
title: Pattern: Effects-First Card Model with Range/AoE
type: pattern
tags: [pattern, cards, game-design, rust]
---

## Problem
Card games need a flexible way to define card behaviors that works for both player and enemy, supports multiple effect types, and handles area-of-effect targeting on a grid.

## Solution
Define cards as a data structure with a list of effects, where each effect has a type, value, and targeting parameters (range + AoE). Combat role is determined by effects, not by card type labels.

```
CardDef {
    id: &'static str,
    name: &'static str,
    cost: i32,
    effects: Vec<CardEffect>,
    rarity: Rarity,
}

CardEffect {
    effect: Effect,   // Damage, Heal, Shield, DrawCards, ApplyBuff
    range: i32,       // Chebyshev distance from caster
    aoe: i32,         // Cross-shaped blast radius
}
```

### Cross-Shaped AoE
AoE uses a cross pattern (cardinal directions only, no diagonals):
- AoE 1 = center tile only
- AoE 2 = center + 4 cardinal neighbors
- AoE 3 = center + cardinal arms of length 2

The `cross_aoe(center, radius)` function computes affected tiles. Tile bounds are checked at resolution time, not generation time.

### Key Design Choices
- Same CardDef used for player and enemy cards — no separate type hierarchy
- Effects are resolved by a shared function that mutates GridUnit directly
- DrawCards effect draws from the acting faction's deck (player or enemy)
- Cards are stateless — all state lives in Hand/Deck/Graveyard containers

## When to Use
- Grid-based tactical card games
- Games where cards need varied targeting (self, melee, ranged, AoE)
- Shared card pools between player and enemy

## When Not to Use
- Card games where effects are simple and uniform (e.g., all single-target)
- Games needing complex card interaction stacking (MTG-style) — the linear effect list doesn't handle nested triggers

## Related
- @wiki/specs:card-system-in-battle-deck
- @wiki/specs:enemy-system-deck-ai-difficulty