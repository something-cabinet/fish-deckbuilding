---
title: Combat feedback animations (Godot Tween/AnimationPlayer)
type: task
id: wiki:tasks:combat-feedback-animations-godot-tweenanimationplayer
status: todo
priority: medium
tags: [godot, ui, animations, feedback]
acceptance_criteria:
  - text: "Damage dealt shows floating number above the target that fades"
  - text: "Coin gain shows a brief sparkle/+N animation"
  - text: "Heal shows a green floating number"
  - text: "All animations implemented with Godot Tween/AnimationPlayer"
  - text: "Animations can be disabled/reduced via a settings toggle"
---

Add floating combat feedback in Godot: damage numbers floating up from units, coin gain sparkle/+N, heal numbers, interest damage flash. Implement via Tween/AnimationPlayer, respecting reduced-motion settings where applicable.