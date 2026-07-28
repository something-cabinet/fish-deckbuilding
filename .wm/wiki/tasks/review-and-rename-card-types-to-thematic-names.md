---
title: Review and rename card types to thematic names
type: task
id: wiki:tasks:review-and-rename-card-types-to-thematic-names
status: todo
priority: medium
tags: [ui, cards, naming, theming]
acceptance_criteria:
  - text: "New card type names feel thematic to fish/debt/underwater setting"
  - text: "CardDef.type updated in src/game/combat/CardTypes.ts"
  - text: "cardData.ts updated with new type values"
  - text: "All card rendering (color coding, type labels, filters) updated"
  - text: "HandViewer, CardTooltip, DeckViewer filter labels updated"
  - text: "EnemyRow and other UI components referencing card type updated"
  - text: "92 tests pass, 0 svelte-check errors"
---

Current card types are generic: 'attack', 'defense', 'equipment', 'recruit'. Review and rename to thematic fish/debt/underwater city equivalents. Examples: 'attack' → 'strike'/'fin_slice', 'defense' → 'shell'/'barrier', 'equipment' → 'gear'/'rig', 'recruit' → 'crew'/'ally'. Update CardDef.type in CardTypes.ts, cardData.ts, and all UI references (color coding, labels, filters).