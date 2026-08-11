---
title: Pattern: Container-Based Layout for Dynamically-Created Card Slots
type: pattern
tags: [pattern, ui, layout, react]
status: active
edges:
  - {type: references, target: wiki:tasks/crafting-ui-scene-nodes}
  - {type: answers, target: wiki:specs/card-crafting-ui}
---

## Problem

When dynamically creating card slot UI in React/JS with manual DOM positioning, using inline styles with absolute pixel offsets on elements within a CSS grid or flex container causes text overlap and layout issues. The children don't respect absolute positioning reliably when the parent is managed by a grid/flex layout.

## Solution

Use container-based layout instead of absolute positioning. Each card slot is a styled container div (for the visual background) containing flexbox children that arrange child elements. Use CSS flex row for side-by-side elements (cost + affix count).

```tsx
<div className="card-slot" style={{ minWidth: 180, minHeight: 70 }}>
  <div className="card-slot-body" style={{ display: "flex", flexDirection: "column", gap: 2 }}>
    <span className="card-name">{card.name}</span>
    <div className="card-meta" style={{ display: "flex", gap: 8 }}>
      <span className="cost">{card.cost}g</span>
      <span className="affix-count">{card.affixes.length} affix</span>
    </div>
  </div>
</div>
```

## When to Use

- Dynamically creating card slots, inventory items, or list entries via React/JS
- Any UI where children are added to a Container-managed parent (GridContainer, VBoxContainer, etc.)
- When the contents per slot vary (some have corrupted labels, ineligibility reasons, etc.)

## When Not to Use

- Static UI defined in HTML/EJS — absolute positioning in the markup is fine
- Nodes with a single child â€” `MarginContainer` or `PanelContainer` is simpler
- When precise pixel-perfect positioning is required across all resolutions

## Related

- @wiki/specs/card-crafting-ui
- @wiki/specs/card-crafting-ui (layout patterns)