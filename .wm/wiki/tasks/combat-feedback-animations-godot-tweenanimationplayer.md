---
title: Combat feedback animations (Godot Tween/AnimationPlayer)
type: task
tags:
- godot
- ui
- animations
- feedback
status: todo
priority: medium
acceptance_criteria:
- text: Damage dealt shows floating number above the target that fades
  checked: false
- text: Coin gain shows a brief sparkle/+N animation
  checked: false
- text: Heal shows a green floating number
  checked: false
- text: All animations implemented with Godot Tween/AnimationPlayer
  checked: false
- text: Animations can be disabled/reduced via a settings toggle
  checked: false
assignee: you
---

Add floating combat feedback in Godot: damage numbers floating up from units, coin gain sparkle/+N, heal numbers, interest damage flash. Implement via Tween/AnimationPlayer, respecting reduced-motion settings where applicable.