---
title: Dynamic hand layout for variable card count (Godot Control nodes)
type: task
tags:
- godot
- ui
- hand
- responsive
status: todo
priority: medium
acceptance_criteria:
- text: Hand renders correctly with 1-10 cards without horizontal overflow
  checked: false
- text: Cards overlap when hand is full, spread apart on hover
  checked: false
- text: Layout recalculates cleanly on viewport resize
  checked: false
- text: No layout shift during combat state changes
  checked: false
assignee: you
---

Implement viewport-aware card overlap/spacing for the hand in Godot using Control nodes (HBoxContainer or custom layout). Even spacing for small hands, overlap with spread-on-hover for full hands, no horizontal overflow.