---
{}
relates_to:
  - {type: references, target: wiki:tasks:rewrite-combat-into-excalibur-ecs-with-events}
---

---
title: Pattern: Run/Combat State Split for Roguelite Deckbuilders
type: pattern
id: wiki:patterns:run-combat-state-split
tags: [pattern, state, architecture, roguelite]
---

## Problem
In roguelite deckbuilders, some state persists across battles (deck, HP, gold, relics) and some is per-battle (hand, draw pile, grid, turn phase). Mixing them leads to deck corruption, state leaks, and hard-to-track bugs.

## Solution
Split state into two scopes:
- **RunState**: heroHp, heroMaxHp, deck, gold, mapNodes, relics, allies, seed, act (persists across battles)
- **CombatState**: hand, battleDeck (copy of run deck), battleDiscard, sellPile, coins, enemies, turnPhase, turnNumber (per-battle only)

Combat initializes from run state when entering a battle. The run deck is copied (not referenced) into the battle deck. During combat, all draws/pitches/plays modify the battle deck only. After combat, the battle deck is discarded and run state is updated with results (HP changes, rewards).

## When to Use
- Any roguelite with a persistent run across multiple battles
- Card games where deck modification happens between battles
- Games where state must survive scene transitions

## When Not to Use
- Single-battle games (no persistence needed)
- Real-time games where per-frame state doesn't split cleanly

## Related
- @task-tasks:rewrite-combat-into-excalibur-ecs-with-events