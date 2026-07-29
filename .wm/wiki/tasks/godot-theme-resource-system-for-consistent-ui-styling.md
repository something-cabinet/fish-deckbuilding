---
title: Godot Theme resource system for consistent UI styling
type: task
id: wiki:tasks:godot-theme-resource-system-for-consistent-ui-styling
status: todo
priority: medium
tags: [godot, ui, theming]
acceptance_criteria:
  - text: "All UI colors/styles reference the shared Theme resource, no hardcoded colors in scenes"
  - text: "Semantic StyleBox variants exist for coin, hp, attack, defense"
  - text: "Panel/zone background, border, and shadow styles are reusable theme variants"
  - text: "Theme resource is the single source of styling for all Control nodes"
---

Build a shared Godot Theme resource (replacing the old CSS custom-property plan) defining color scales and semantic StyleBox variants for game concepts (coin, hp, attack, defense, panel/zone backgrounds). Single Theme resource applied project-wide.