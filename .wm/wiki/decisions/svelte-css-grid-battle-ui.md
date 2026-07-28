---
{}
relates_to:
  - {type: references, target: wiki:specs:fish-tactical-rpg}
---

---
title: Decision: Svelte CSS Grid for Battle UI (not Excalibur Canvas)
type: decision
id: wiki:decisions:svelte-css-grid-battle-ui
tags: [decision, ui, grid, svelte, excalibur]
---

## Context
The battle screen needs to render a 9×5 grid with tiles, units, corner-bracket overlays, and click/target interactions. The obvious choice was to render this in Excalibur.js (the game's canvas engine) since it already handles the island map and background.

## Decision
**Render the battle grid using a Svelte CSS Grid overlay**, not an Excalibur canvas. The Excalibur scene provides the background; Svelte handles all interactive grid elements.

Not chosen: Excalibur canvas rendering for the grid, actors for each tile, Excalibur pointer events for click handling.

## Rationale
- **Faster iteration**: CSS Grid is declarative, responsive, and trivial to modify. Grid tiles are divs — no Excalibur actor lifecycle, no pointer event management.
- **Better accessibility**: CSS Grid renders HTML elements — keyboard navigation, ARIA labels, and screen reader support come naturally. Excalibur canvas rendering has none of these.
- **Simpler overlay compositing**: Corner-bracket overlays are SVG files — CSS Grid tiles can load them directly. In Excalibur, each overlay would need to be a separate actor with manual positioning.
- **Responsive by default**: CSS Grid responds to viewport changes with media queries and fractional units. Excalibur requires manual resize handlers.
- **Separation of concerns**: Excalibur handles canvas rendering (background, scene management). Svelte handles UI (grid, interactions, HUD). The bridge syncs them.

## Consequences
- **Positive**: Grid rendering is trivial to implement and maintain (CSS Grid, 40 lines)
- **Positive**: Tile click/hover interactions are native HTML events — no pointer-to-actor mapping
- **Positive**: Responsive layout (3 breakpoints: desktop 64px, tablet 48px, mobile 40px)
- **Positive**: Accessibility via tabindex, ARIA roles/labels on each tile
- **Negative**: Grid is a separate layer from the Excalibur background — needs coordinate sync for visual alignment
- **Negative**: Canvas effects (animated tile shimmer, particle effects on tiles) require JS interop instead of Excalibur's native Systems

## Related
- @wiki/specs/fish-tactical-rpg
- @wiki/patterns/duelyst-corner-bracket-overlay-system