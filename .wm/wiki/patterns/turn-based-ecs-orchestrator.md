---
{}
relates_to:
  - {type: references, target: wiki:tasks:rewrite-combat-into-excalibur-ecs-with-events}
---

---
title: Pattern: CombatOrchestrator for Turn-Based ECS
type: pattern
id: wiki:patterns:turn-based-ecs-orchestrator
tags: [pattern, ecs, turn-based, orchestration]
---

---
title: Pattern: CombatOrchestrator for Turn-Based ECS
type: pattern
tags: [pattern, ecs, turn-based, orchestration]
---

## Problem
Excalibur's ECS Systems run per-frame via `update(elapsed)`. Turn-based games (deckbuilders, card games, strategy RPGs) don't need per-frame updates — their state changes discretely in response to player actions. Adapting Excalibur Systems for turn-based logic forces awkward patterns (polling, state-machine flags inside `update()`).

## Solution
Create an **orchestrator class** that owns ECS entities with components but coordinates turn flow imperatively. The orchestrator:
1. Owns Actor/Entity instances with typed Components (Health, Coin, Turn, Deck, etc.)
2. Exposes action methods (`playCard()`, `sellCard()`, `endPlayerTurn()`, `defend()`)
3. Calls pure domain functions internally (CoinSystem, Keywords, Effects)
4. Emits a `state:changed` snapshot after each action
5. Is **headless-testable** — no Excalibur World/Engine needed

```typescript
class CombatOrchestrator {
  hero: Actor;
  enemies: Actor[] = [];
  private _battleOver = false;

  startBattle(runState, enemies, encounterId, rewardGold, rewardCards) { ... }
  sellCard(cardIndex) { ... }
  playCard(cardIndex, targetIndex) { ... }
  endPlayerTurn() { ... }
  defend(blockedCardIndices, incomingDamage) { ... }
  checkBattleEnd(): 'victory' | 'defeat' | null { ... }
  getStateSnapshot(): Partial<CombatState> { ... }
}
```

The orchestrator acts as the "system" for turn-based logic — but instead of inheriting Excalibur.System, it's a plain class that happens to use Excalibur types for state management.

## When to Use
- Turn-based games using Excalibur.js (deckbuilders, card games, RPG combat)
- Any game where state changes are discrete, not continuous
- Projects that want ECS component benefits without per-frame system complexity

## When Not to Use
- Real-time games that need per-frame system updates (platformers, shooters)
- Projects already using Excalibur Systems effectively for turn logic
- Games where Systems need to register with the Excalibur World for collision/physics

## Related
- @task-tasks:rewrite-combat-into-excalibur-ecs-with-events
- @wiki/patterns/snapshot-state-sync
- @wiki/decisions/pure-function-ecs-pivot