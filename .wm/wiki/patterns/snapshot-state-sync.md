---
{}
relates_to:
  - {type: references, target: wiki:tasks:rewrite-combat-into-excalibur-ecs-with-events}
---

---
title: Pattern: Snapshot-Based State Sync for ECS
type: pattern
id: wiki:patterns:snapshot-state-sync
tags: [pattern, ecs, state, sync]
---

---
title: Pattern: Snapshot-Based State Sync for ECS
type: pattern
tags: [pattern, ecs, state, sync]
---

## Problem
In event-driven ECS architectures, granular per-field events (card:played → sync coins, enemy:hurt → sync HP, combat:defensePhase → sync phase) cause state desyncs. Each handler picks different subsets of state, some fields are never synced, and the accumulation creates unplayable bugs (invisible enemies, soft-locked defense, infinite gold exploits).

## Solution
After every action that mutates state, emit a single `state:changed` event carrying a full snapshot of the current state. The bridge layer subscribes to this single event and does a bulk sync (Object.assign or field-by-field merge). Granular events are kept only for transient UI effects (interest flash, victory/defeat screen transitions).

```
orchestrator.playCard()
  → update ECS components
  → orchestrator.emitStateSnapshot()
  → eventBus.emit('state:changed', snapshot)
  → bridge catches it → syncs all fields to $state
```

The orchestrator provides:
```typescript
getStateSnapshot(): Partial<CombatState> {
  return {
    hand, battleDeck, battleDiscard, sellPile,
    coins, creditUsed, heroHp, heroMaxHp,
    turnPhase, turnNumber,
    enemies: currentEnemies.map(e => ({ ...e.def, hp: e.health.current })),
  };
}
```

This eliminates the per-field desync class entirely — one snapshot handler replaces 15+ individual event handlers.

## When to Use
- Event-driven ECS architectures with a subscriber (UI, bridge, logger)
- Turn-based games where actions are discrete and state changes are transactional
- Any architecture where per-field event handlers have caused desync bugs

## When Not to Use
- Real-time systems where per-frame snapshots would be expensive
- Systems with very high event throughput (snapshots become overhead)
- Single-file applications where the bridge/UI reads state directly

## Known Variant
If the subscriber also needs to mutate state bidirectionally, the snapshot should be read-only and actions dispatched through a separate channel (command pattern). The snapshot is the source of truth, not a writeable store.

## Related
- @task-tasks:rewrite-combat-into-excalibur-ecs-with-events
- @wiki/decisions/pure-function-ecs-pivot