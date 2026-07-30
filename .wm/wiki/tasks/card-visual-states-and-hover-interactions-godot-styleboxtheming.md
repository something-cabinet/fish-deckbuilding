---
title: Card visual states and hover interactions (Godot StyleBox/theming)
type: task
tags:
- godot
- ui
- cards
- interaction
status: todo
priority: medium
acceptance_criteria:
- text: Card hover shows lift + glow via Tween
  checked: false
- text: Selected card has distinct border glow
  checked: false
- text: Unplayable cards show reduced opacity
  checked: false
- text: Card-played animation plays before removal from hand
  checked: false
- text: All transitions implemented via Godot Tween/AnimationPlayer, no per-frame manual code
  checked: false
assignee: you
---

Implement card visual states in Godot using StyleBoxFlat and AnimationPlayer/Tween: hover (lift + glow), selected (border highlight), targetable (pulse), unplayable (dimmed), played (fade-out).