---
title: gdext scene node type must match custom class
type: memory
tags: [godot, gdext, scene-setup]
status: active
---

A .tscn node using a Rust GodotClass must have type="<CustomClass>" directly, not type="Node2D" + a GDScript stub extending the class — a script can't narrow a native node into a subclass. Symptom: "Script inherits from native type X, so it can't be assigned to an object of type Y" with zero extension-load errors, only visible in Debugger > Errors on F5. Full reference: @wiki/concepts:gdext-scene-node-type-mismatch