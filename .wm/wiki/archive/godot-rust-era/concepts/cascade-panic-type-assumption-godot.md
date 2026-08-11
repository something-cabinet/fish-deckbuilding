---
type: concept
tags: [failure, godot, debugging]
---

## Failure: Cascade Panic from Type-Homogeneity Assumption in get_children()

### What went wrong

A `sync_visuals_ref()` death-dissolve loop iterated over `units_node.get_children()` and cast every child to `Node2D`, panicking when it encountered a floating damage label node (auto-named `@Label@N`). That first panic triggered a secondary `bind_mut()` panic during Godot's error unwind — a cascade panic that masked the real root cause.

### Root cause

**Primary:** `for child in units.get_children()` assumed every child is `Node2D`. Godot allows mixed-type children (labels, sprites, particles). The damage label added by `spawn_floating_number()` was a `Label`, not a `Node2D`.

**Secondary (cascade masking):** The first `get_node_as::<Node2D>()` panic triggered error handling inside the Godot frame that called `bind_mut()` — which panicked again under a borrow/lock that was already in a bad state. The *second* panic's stack trace appeared first, making it look like the bug was in `bind_mut()`.

### Prevention

- **Never assume type homogeneity** when iterating `get_children()`. Filter by type or name prefix before casting
- When a `bind_mut()` or borrow panic appears in Godot during a frame update, **check for a prior panic in the same frame** — cascade panics are a common Godot anti-pattern.
- Use explicit node names for dynamically added nodes (e.g., `set_name("FloatingDamage")`) so they can be filtered by name
- Godot auto-names unnamed nodes `@ClassName@N` — seeing this pattern in a path is a smell that a node was created without a name and may be untyped

### Fix applied

`battle_scene.rs:858` — added `(name.starts_with("Unit_Hero") || name.starts_with("Unit_Enemy"))` filter before the `get_node_as::<Node2D>()` call.

### Time lost

~45 minutes debugging the cascade before isolating the real root cause.

### Related

- Commit `0faa982`