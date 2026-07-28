---
{}
relates_to:
  - {type: references, target: wiki:tasks:css-theming-system-with-custom-properties}
---

---
title: Howto: CSS Variable Theming System
type: howto
id: wiki:howto:css-variable-theming-system
tags: [howto, css, theming]
---

---
title: Howto: CSS Variable Theming System
type: howto
tags: [howto, css, theming, patterns]
---

## Problem
Game UI colors are scattered across components as hardcoded hex values. Changing the color palette or adding dark/light mode requires touching every component. Components reference raw colors without semantic meaning (what does `#e85d4e` mean?).

## Solution
Use a three-layer CSS custom property hierarchy:

### Layer 1: Raw Palette
Define every unique color value once at the `:root` level:
```css
:root {
  --abyss: #0a1628;
  --deep: #0f2236;
  --coral: #e85d4e;
  --gold: #f4c430;
  --parchment: #e8dcc5;
  /* ... etc */
}
```

### Layer 2: Semantic Aliases
Map palette colors to meaningful roles:
```css
:root {
  --bg-primary: var(--abyss);
  --bg-panel: rgba(15, 34, 54, 0.9);
  --coin-red: var(--coral);
  --coin-yellow: var(--gold);
  --coin-blue: #3b82f6;
  --hp-bar: #ef4444;
  --text-primary: var(--parchment);
}
```

### Layer 3: Component Variables (optional)
For complex components, define component-scoped variables that reference semantic ones. This keeps component CSS readable and changeable.

### Benefits
- **Single source of truth**: Change `--coral` and all coral elements update
- **Self-documenting**: `color: var(--hp-bar)` is clearer than `color: #ef4444`
- **Themeable**: Swap the palette layer for dark/light/seasonal themes
- **Tree-shakeable**: Unused variables are dead code, easy to spot

## When to Use
- Projects with more than 10 components sharing colors
- Games or apps with multiple themes planned
- Design systems being documented

## When Not to Use
- Single-page prototypes
- Projects with fewer than 5 components

## Reference
- @wiki/core:conventions — "CSS variables" golden rule
- app.css in the project root