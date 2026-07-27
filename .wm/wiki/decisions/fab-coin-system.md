---
{}
relates_to:
  - {type: references, target: wiki:tasks:rewrite-combat-into-excalibur-ecs-with-events}
---

---
title: Decision: FaB Coin System with Sell Pile Ordering
type: decision
id: wiki:decisions:fab-coin-system
status: approved
tags: [decision, combat, resource, coins]
---

## Context
The combat resource system went through several iterations: fixed energy (3/turn), pitch/overdraft system, and finally FaB-style coins with credit limit.

## Decision
Use FaB-style coin system: each turn starts at 0 coins. Cards can be sold (to bottom of deck via sell pile ordering) for their coinValue. Cards cost coins to play. Can borrow up to credit limit (-5). Interest damage = |debt| at end of turn if negative. Coins reset to 0 each turn (no carryover).

Sell pile: sold cards go to a temporary sellPile. At end of turn, player reorders them before they go to bottom of deck. This lets players plan deck cycling.

## Rationale
- FaB-style reset prevents resource snowballing across turns
- Coin theme fits the debt/finance fish setting
- Sell pile ordering creates unique strategic depth (know when cards cycle back)
- Credit limit + interest damage makes debt a meaningful risk/reward tradeoff
- Simpler to balance than carryover resources

## Consequences
- Each turn is a clean decision slate
- No degenerate savings strategies
- Interest damage creates urgency around debt management
- Sell pile adds a unique mechanic not found in other deckbuilders

## Related
- @task-tasks:rewrite-combat-into-excalibur-ecs-with-events