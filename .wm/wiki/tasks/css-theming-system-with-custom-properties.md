---
title: CSS theming system with custom properties
type: task
id: wiki:tasks:css-theming-system-with-custom-properties
status: todo
priority: medium
tags: [ui, theming, css]
acceptance_criteria:
  - text: "All color values reference CSS variables (no hex/rgb in components)"
  - text: "Semantic aliases exist for game concepts (coin, hp, attack, defense)"
  - text: "Zone/surface variables defined (panel-bg, panel-border, zone-bg)"
  - text: "Dark/light mode variable overrides ready (not active, just structured)"
  - text: "app.css is the single source of all CSS variables"
---

Refactor app.css to a comprehensive CSS custom property theme system. Define color scales (abyss, deep, coral, gold, parchment) with semantic aliases (--coin-color, --card-attack, --card-defense, --hp-hero, --hp-enemy). Extract zone background, border, and shadow patterns into reusable variables.