---
{}
relates_to:
  - {type: references, target: wiki:core:conventions}
---

---
title: Failure: GDScript Method Names Shadowing Built-in Engine Methods
type: concept
id: wiki:concepts:gdscript-method-shadowing-builtins
tags: [failure, gdscript, godot, naming]
---

## What went wrong

A method named `hide()` was defined in a GDScript that `extends Panel` (inherits `CanvasItem`). Godot's engine treats this as overriding `CanvasItem.hide()` and warns: "The method 'hide()' overrides a method from native class 'CanvasItem'. This won't be called by the engine and may not work as expected."

Because the project treats warnings as errors, this broke the build/run.

## Root cause

GDScript allows scripts to define methods with the same name as built-in engine methods on parent classes. The engine detects this at runtime and emits a warning, but the script author may not realize `hide()`, `show()`, `queue_free()`, `_ready()`, `_process()`, `_input()`, etc. are already defined on `Node`/`CanvasItem`/`Control`.

Common shadowing traps:
- `hide()` → `CanvasItem.hide()`
- `show()` → `CanvasItem.show()`
- `queue_free()` → `Node.queue_free()`
- `_ready()` → `Node._ready()` (but this is intentional — the engine calls overrides)
- `_process()` → `Node._process()` (same — intentional override pattern)
- `print()` → (global, but `print()` is built-in)
- `get()` → `Object.get()` — breaks property access

## Prevention

- Never name a GDScript method after any method on `Object`, `Node`, `CanvasItem`, or `Control` unless the intent is to override engine behavior
- Use descriptive alternative names:
  - `dismiss()` instead of `hide()`
  - `reveal()` or `display()` instead of `show()`
  - `remove()` or `cleanup()` instead of `queue_free()`
- When in doubt, check the Godot API docs for the node's parent class before naming
- Godot's built-in method list (non-exhaustive) for `CanvasItem`/`Control`/`Node` includes: `hide`, `show`, `queue_free`, `_ready`, `_process`, `_input`, `_unhandled_input`, `_enter_tree`, `_exit_tree`, `_draw`, `get`, `set`, `has_method`, `call`, `connect`, `disconnect`, `emit_signal`, etc.

## Time lost

~2 minutes to identify, fix, and verify.

## Related
- @wiki/core:conventions (GDScript usage section)