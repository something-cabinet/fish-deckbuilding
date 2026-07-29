---
title: Dynamic hand layout for variable card count (Godot Control nodes)
type: task
id: wiki:tasks:dynamic-hand-layout-for-variable-card-count-godot-control-nodes
status: todo
priority: medium
tags: [godot, ui, hand, responsive]
acceptance_criteria:
  - text: "Hand renders correctly with 1-10 cards without horizontal overflow"
  - text: "Cards overlap when hand is full, spread apart on hover"
  - text: "Layout recalculates cleanly on viewport resize"
  - text: "No layout shift during combat state changes"
---

Implement viewport-aware card overlap/spacing for the hand in Godot using Control nodes (HBoxContainer or custom layout). Even spacing for small hands, overlap with spread-on-hover for full hands, no horizontal overflow.