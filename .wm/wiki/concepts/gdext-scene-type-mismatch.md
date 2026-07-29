---
title: Failure: GDScript-Native Scene Type Mismatch
type: concept
tags: [failure, godot, gdext, scene]
status: active
---

## What went wrong

After adding hot-reload support, the Godot editor refused to load `battle.tscn` with:

```
Script inherits from native type 'BattleScene', so it can't be assigned to an object of type: 'Node2D'
```

## Root cause

The scene file `godot/scenes/battle/battle.tscn` had:

```gdscript
[node name="BattleScene" type="Node2D"]
script = ExtResource("1")   # battle.gd which does: extends BattleScene
```

And `battle.gd` contained only:
```gdscript
extends BattleScene
```

In Godot 4, when a GDScript `extends` a **native** type (a gdext Rust class), the scene node's `type` must match that native class, not its parent. `BattleScene` extends `Node2D` via `#[class(base=Node2D)]`, so the node type must be `type="BattleScene"`, not `type="Node2D"`.

The GDScript bridge file was unnecessary — `BattleScene` is already a fully implemented Rust class registered by gdext.

## Prevention

1. When a Rust gdext class replaces a Godot node, use the native class name as the scene node type:
   - `type="BattleScene"` not `type="Node2D"` when `BattleScene` extends `Node2D`
2. A GDScript bridge file (`extends BattleScene` with no additional logic) is unnecessary — remove it
3. The scene will still work without the extension compiled if using a bridge GDScript, BUT the node type must still match the native class when the extension IS loaded

## Time lost
~10 minutes debugging after hot-reload work

## Related
- @wiki/tasks:godot-battle-07-hot-reload-fixes
- @wiki/concepts/gdext-bridge-pattern
