---
title: Combat feedback animations
type: task
id: wiki:tasks:combat-feedback-animations
status: todo
priority: medium
tags: [ui, animations, feedback]
acceptance_criteria:
  - text: "Damage dealt shows floating number above enemy that fades"
  - text: "Coin gain shows brief sparkle or +N animation"
  - text: "Heal shows green floating number"
  - text: "All animations use CSS @keyframes (no JS animation loops)"
  - text: "Animations respect prefers-reduced-motion"
---

Add floating text animations for combat events: damage numbers floating up from enemies, coin gain sparkles, heal numbers, interest damage flash. Pattern from Talishar's DamagePopup/HealingPopup using CSS @keyframes.