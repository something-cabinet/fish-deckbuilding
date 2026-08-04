---
title: StS2 Architecture — Command Pipeline, ModelDB, Pooling (source analysis)
type: reference
id: wiki:reference:sts2-architecture-command-pipeline
tags: [reference, research, sts2, command-pattern, architecture, gof]
---

# StS2 Architecture — Command Pipeline, ModelDB, Pooling (source analysis)

Source analysis (user-provided, 2026-08-03) of **Slay the Spire 2** (Godot + C#) software architecture. Informs @wiki/specs/card-effect-registry (D9 command pipeline) and @wiki/reference/design-patterns-gof (Flyweight/Prototype/Strategy/Command mapping).

## Command Pattern — GameActionQueue

Gameplay operations do not execute immediately when triggered by UI/game loop. Actions are packaged into command objects and pushed onto an ordered queue (`GameActionQueue`).

```csharp
// Example conceptual implementation based on Bash.cs
public class BashCard : AbstractCard
{
    public override void OnPlay(Creature target)
    {
        var cmd = new DamageCommand(
            source: Owner, target: target,
            amount: GetCalculatedDamage(), type: DamageType.Normal);
        ActionQueue.Enqueue(cmd);
    }
}
```

Payoffs:
- **Deterministic replays** — logging serializable command objects enables full combat replay (`.mcr` files).
- **Multiplayer sync** — clients transmit light, ordered command payloads instead of full state trees (lockstep).

## Flyweight + Prototype — ModelDB + mutableClone

~577 cards, ~1,600 models (relics/powers/enemies). Mega Crit combines Flyweight and Prototype in `AbstractModel`/`ModelDB`:
- **Flyweight:** boot creates a single master dictionary of every card def; base props read from shared read-only master.
- **Prototype:** `mutableClone()` (wrapping `MemberwiseClone()`) creates isolated dynamic instances (upgrades, temp cost mods, scaled damage).

```csharp
public abstract class AbstractModel
{
    public string Id { get; set; }
    public int BaseCost { get; set; }
    public AbstractModel MutableClone()
    {
        var clone = (AbstractModel)this.MemberwiseClone();
        clone.InitializeDynamicProperties();
        return clone;
    }
}

public static class ModelDB
{
    private static readonly Dictionary<string, AbstractModel> Models = new();
    public static T GetMaster<T>(string id) where T : AbstractModel => (T)Models[id];
    public static T CreateInstance<T>(string id) where T : AbstractModel
        => (T)GetMaster<T>(id).MutableClone();
}
```

## Strategy Pattern — AutoSlay QA bot

Automated bot plays thousands of seeded runs to detect softlocks. Per-room-type handler classes behind `IRoomHandler`, looked up in a dictionary — no massive if-else/switch.

```csharp
public interface IRoomHandler { void HandleRoom(RoomState state); }
public class ShopRoomHandler : IRoomHandler { ... }
public class CombatRoomHandler : IRoomHandler { ... }

public class AutoSlayBot
{
    private readonly Dictionary<RoomType, IRoomHandler> _handlers = new()
    {
        { RoomType.Shop, new ShopRoomHandler() },
        { RoomType.Combat, new CombatRoomHandler() },
    };
    public void ProcessCurrentRoom(RoomState currentRoom)
    {
        if (_handlers.TryGetValue(currentRoom.Type, out var handler))
            handler.HandleRoom(currentRoom);
    }
}
```

New room types = add lookup entry + standalone handler class; zero bot changes.

## Object Pool Pattern — Card UI nodes

Repeated instantiate/destroy of card UI nodes causes GC pauses. Pool recycles nodes. **Signal hygiene is critical:** on recycle, disconnect all signal connections or ghost events/leaks occur.

```csharp
public void Recycle(CardNodeUI cardNode)
{
    foreach (var connection in cardNode.GetSignalConnectionList("pressed"))
        cardNode.Disconnect("pressed", connection.Callable);
    cardNode.Hide();
    cardNode.ResetVisualState();
    _pool.Enqueue(cardNode);
}
```

## Architectural Lessons

1. **Async command pipeline > game loop:** explicit async action queue simplifies state management and guarantees lockstep netcode; avoids `_process` tick loops.
2. **Explicit code over data externalization:** cards as native C# classes (compile-time type checking, refactoring safety, performance) — note this is a **counterpoint** to data-driven JSON card defs; Mega Crit's scale (577 cards, dynamic behaviors) is where code wins, whereas this repo's 9 cards + authoring UI favor data (see @wiki/specs/card-effect-registry D8).
3. **Clean teardown in pooled systems:** manual signal/observer cleanup mandatory to prevent ghost callbacks.

## Relevance to this repo

| StS2 | This repo |
|------|-----------|
| GameActionQueue (all actions as commands) | Target: full command pipeline (spec D9); `EnemyStep` already command-shaped |
| ModelDB + mutableClone | `CARD_LIBRARY` + `makeCard` + `{ ...def }` spreads (already flyweight/prototype) |
| AutoSlay IRoomHandler | `planEnemyTurn` / `cardTargets` (Strategy seam) |
| Card node pool | Not needed at current scale (9 cards, DOM UI) |

Related: @wiki/reference/design-patterns-gof, @wiki/specs/card-effect-registry, @wiki/patterns/snapshot-state-sync.
