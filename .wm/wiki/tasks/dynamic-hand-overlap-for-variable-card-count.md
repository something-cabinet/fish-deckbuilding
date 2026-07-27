---
title: Dynamic hand overlap for variable card count
type: task
id: wiki:tasks:dynamic-hand-overlap-for-variable-card-count
status: todo
priority: high
tags: [ui, hand, responsive]
acceptance_criteria:
  - text: "Hand renders correctly with 1-10 cards without horizontal overflow"
  - text: "Cards overlap when hand is full, spread on hover"
  - text: "Resize handler is throttled via requestAnimationFrame"
  - text: "No layout shift during combat state changes"
  - text: "Mobile viewport (375px) shows readable cards"
---

Implement viewport-aware card overlap calculation for HandViewer. When hand has few cards, space them evenly. When hand is full, overlap cards with negative margins. Cards spread apart on hover. Uses requestAnimationFrame-throttled resize handler (same pattern as Talishar).