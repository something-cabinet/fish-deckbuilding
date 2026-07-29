---
title: GDExtension Click Input — Use _input() Over _unhandled_input()
type: memory
tags: [godot, gdext, input, pattern]
status: active
---

Mouse clicks on GDExtension bridge scenes with CanvasLayer UI get consumed by Control _gui_input before _unhandled_input can fire. Fix: use _input() (fires before UI) instead of _unhandled_input(). Full pattern in @wiki/concepts:gdext-bridge-pattern