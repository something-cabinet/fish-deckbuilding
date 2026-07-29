---
title: Card visual states and hover interactions (Godot StyleBox/theming)
type: task
id: wiki:tasks:card-visual-states-and-hover-interactions-godot-styleboxtheming
status: todo
priority: medium
tags: [godot, ui, cards, interaction]
acceptance_criteria:
  - text: "Card hover shows lift + glow via Tween"
  - text: "Selected card has distinct border glow"
  - text: "Unplayable cards show reduced opacity"
  - text: "Card-played animation plays before removal from hand"
  - text: "All transitions implemented via Godot Tween/AnimationPlayer, no per-frame manual code"
---

Implement card visual states in Godot using StyleBoxFlat and AnimationPlayer/Tween: hover (lift + glow), selected (border highlight), targetable (pulse), unplayable (dimmed), played (fade-out).