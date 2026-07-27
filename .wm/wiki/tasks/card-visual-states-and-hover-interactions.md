---
title: Card visual states and hover interactions
type: task
id: wiki:tasks:card-visual-states-and-hover-interactions
status: todo
priority: medium
tags: [ui, cards, interaction]
acceptance_criteria:
  - text: "Card hover shows translateY lift + shadow elevation"
  - text: "Selected card has distinct border glow"
  - text: "Unplayable cards show reduced opacity"
  - text: "Card played animation (brief scale/translate before removal)"
  - text: "All transitions use CSS only (no JS animation timers)"
---

Upgrade CardTooltip and hand cards with proper visual states: hover (lift + glow), selected (border highlight), targetable (pulse), disabled (dimmed), played (fade-out). Add smooth CSS transitions for state changes.