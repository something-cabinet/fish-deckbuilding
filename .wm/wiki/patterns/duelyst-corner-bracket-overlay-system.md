---
{}
relates_to:
  - {type: references, target: wiki:specs:fish-tactical-rpg}
---

---
title: Pattern: Duelyst Corner-Bracket Overlay System for Tile Range Display
type: pattern
id: wiki:patterns:duelyst-corner-bracket-overlay-system
tags: [pattern, grid, ui, duelyst, overlay]
---

## Problem
How to visually communicate movement range, attack range, and valid target tiles on a tactical grid without obscuring the board artwork, unit sprites, or grid lines underneath.

## Solution
Use **pixel-art corner bracket overlays** at the 4 corners of each tile, not full-tile color fills. Each bracket state is pre-rendered based on which of its 4 cardinal neighbors are also highlighted — a 4-bit mask system that creates a clean outer perimeter around the highlighted region.

### Color Coding
| Action | Color | Usage |
|--------|-------|-------|
| Movement | White (#e8dcc5) | Tiles the unit can move to |
| Attack | Red (#e85d4e) | Enemies that can be attacked |
| Summon/Spawn | Green (#22c55e) | Valid summon positions |
| Spell target | Blue (#3b82f6) | Valid spell targets |
| Hover | Same as action | Current mouse-over tile |
| Selected unit | Yellow pulse (#f4c430) | Currently selected unit glow |
| Provoke | Amber chain pulse | Enemy immobilized by Provoke |

### 4-Bit Mask System
Each overlay tile encodes which of 4 cardinal neighbors (top=1, right=2, bottom=4, left=8) are also highlighted:
- `mask0` (0000): No neighbors → all 8 bracket arms drawn (full 4 corners)
- `maskF` (1111): All neighbors → empty tile (inner region, no brackets)
- `mask3` (0011): Top + right neighbors → only left & bottom edges drawn

When placed adjacent, brackets merge seamlessly into a continuous outer perimeter.

## When to Use
- Grid-based tactical combat (9×5 Duelyst, 4×2 Cross Blitz, or any tile grid)
- When board state readability is paramount (CCGs, tactical RPGs)
- When terrain/unit art should remain fully visible under overlays

## When Not to Use
- Games without tile grids
- Full-tile color fills acceptable (simpler grid games like Final Fantasy Tactics)
- Overlay clarity not critical (casual games)

## Implementation
1. Generate 16 SVG files per overlay color (one per mask value) — 64×64 viewBox
2. Each tile in the grid computes its mask during rendering
3. Load the correct SVG based on (color, mask) pair
4. See `public/sprites/overlays/` for reference implementation

## Related
- @wiki/specs/fish-tactical-rpg
- OpenDuelyst source: `app/resources/tiles/`