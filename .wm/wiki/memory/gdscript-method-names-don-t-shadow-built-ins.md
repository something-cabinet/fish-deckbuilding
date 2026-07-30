---
title: GDScript Method Names — Don't Shadow Built-ins
type: memory
tags: [gdscript, godot, naming, failure]
status: active
---

Never name GDScript methods after built-in CanvasItem/Node/Control methods (`hide()`, `show()`, `queue_free()`, etc.). Use alternatives: `dismiss()` instead of `hide()`, `reveal()` instead of `show()`. The engine warns and won't call the override. Full reference: @wiki/concepts/gdscript-method-shadowing-builtins