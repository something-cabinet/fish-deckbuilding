---
title: gdext 0.5.4 API gotchas
type: memory
tags: [godot, rust, gdext]
status: active
---

create_tween returns Gd<Tween> (not Option), typed signals for built-in nodes, get_node_as panics on type mismatch. Full ref: @wiki/concepts:gdext-bridge-pattern