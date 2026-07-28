---
{}
relates_to:
  - {type: relates_to, target: wiki:concepts:gdext-bridge-pattern}
---

---
title: Failure: GDExtension Scene Node Type Must Match Custom Class
type: concept
id: wiki:concepts:gdext-scene-node-type-mismatch
tags: [failure, godot, gdext, scene-setup]
---

## What went wrong
`battle.tscn`'s root node was declared as native type `Node2D`, with a one-line GDScript (`battle.gd`, containing only `extends BattleScene`) attached via `script=`. `BattleScene` is a Rust GodotClass registered with `#[class(base=Node2D)]`. Running the scene (F5) in Godot 4.7.1 threw:

```
Script inherits from native type 'BattleScene', so it can't be assigned to an object of type: 'Node2D'
```

This looked like a GDExtension load failure, but it wasn't:
- `godot/battle.gdextension` was correctly registered (present in `.godot/extension_list.cfg`)
- The Output panel showed **zero** errors on project open or editor startup
- No class-name collisions (`global_script_class_cache.cfg` was empty, no duplicate `BattleScene` symbols)
- `cargo build` succeeded and the `.dll` was in the exact path the `.gdextension` file pointed to
- The installed Godot version (4.7.1) matched the crate's bundled `extension_api.json` (gdext ships bindings up to 4.7)
- The error only appeared in **Debugger > Errors**, and only at scene instantiation (F5), never on project open

All of that made the extension itself look broken, which sent debugging down the wrong path (checking dll paths, editor cache, version mismatches, hot-reload artifacts like `~godot_battle_scaffold.dll`/`.pdb`) before finding the actual cause.

## Root cause
A script's declared base (`extends X`) can only *add* behavior on top of a node whose actual type already **is** `X` or a descendant of it. It cannot narrow a plain built-in node (`Node2D`) down into a more specific registered class (`BattleScene`) — that inheritance direction is backwards. This is different from ordinary GDScript, where `extends Node2D` scripts attach fine to `Node2D` nodes because there's no separate native subclass involved.

For a GDExtension-registered class, the `.tscn` node's `type=` attribute must be set to the **custom class name itself** (`type="BattleScene"`), not the built-in base type. Godot 4.7 validates this strictly at scene-instantiation time and rejects the mismatch.

## Prevention
- When a Rust/GDExtension class provides all the node's behavior via `#[godot_api] impl INode2D` (or similar), give it its own `.tscn` node with `type="<CustomClassName>"` directly — no GDScript wrapper needed at all.
- Only attach a GDScript to a GDExtension-typed node if that script adds behavior *on top of* the already-correct native type (and even then, the node's `type=` must already be the custom class, not `extends`-ed up to it from a script).
- If you see "Script inherits from native type 'X', so it can't be assigned to an object of type: 'Y'" with no extension-load errors anywhere, check the `.tscn` node's `type=` first — before suspecting the extension build, dll path, or editor cache.

## Time lost
~30-45 minutes across several rounds of ruling out extension-load failures (dll path, editor cache, Godot/gdext version compatibility, hot-reload artifacts) before inspecting the `.tscn` node type directly.

## Related
- @wiki/concepts:gdext-bridge-pattern
- @wiki/decisions:godot-rust-gdext-pivot