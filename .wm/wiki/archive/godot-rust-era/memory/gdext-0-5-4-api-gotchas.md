---
title: gdext 0.5.4 API gotchas
type: memory
tags: [godot, rust, gdext]
status: active
---

create_tween returns Gd<Tween> (not Option), typed signals for built-in nodes, get_node_as panics on type mismatch. Full ref: @wiki/concepts:gdext-bridge-pattern

Control layout API: FocusMode::ALL for interactive buttons, LayoutPreset::TOP_LEFT/TOP_RIGHT for anchored HUD, custom_minimum_size for buttons, ScrollContainer with ScrollMode for scrollable areas. Flat buttons (set_flat(true)) replace manual label click detection. Full ref: @wiki/concepts:gdext-bridge-pattern