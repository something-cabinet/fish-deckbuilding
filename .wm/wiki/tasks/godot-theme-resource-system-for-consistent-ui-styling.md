---
title: Godot Theme resource system for consistent UI styling
type: task
tags:
- godot
- ui
- theming
status: todo
priority: medium
acceptance_criteria:
- text: All UI colors/styles reference the shared Theme resource, no hardcoded colors in scenes
  checked: false
- text: Semantic StyleBox variants exist for coin, hp, attack, defense
  checked: false
- text: Panel/zone background, border, and shadow styles are reusable theme variants
  checked: false
- text: Theme resource is the single source of styling for all Control nodes
  checked: false
assignee: you
---

Build a shared Godot Theme resource (replacing the old CSS custom-property plan) defining color scales and semantic StyleBox variants for game concepts (coin, hp, attack, defense, panel/zone backgrounds). Single Theme resource applied project-wide.