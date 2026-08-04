---
title: Pattern: Targeting Arrow Dual Feedback
type: pattern
tags: [pattern, ui-feedback, game-ui, targeting]
---

---
title: "Pattern: Targeting Arrow Dual Feedback"
type: pattern
tags: ["pattern", "ui-feedback", "game-ui", "targeting"]
when_to_use: Turn-based tactics with ranged targeting (click-to-arm or drag-to-board) where two input modes should share one visual language
example: |
  const [arrow, setArrow] = useState<ArrowState | null>(null)
  const computeArrow = useCallback((clientX, clientY) => { ... setArrow({ fromX, fromY, toX: clientX, toY: clientY, valid }) }, [])
  {arrow && <TargetingArrow {...arrow} />}
---

## Problem

Turn-based tactics UIs need clear, unified feedback for two distinct interaction modes:
1. Click-to-arm targeting (user clicks a card, moves cursor, expects visual indication of valid targets)
2. Drag-and-drop targeting (user drags a card/unit across the board with the cursor)

Without unified feedback, these feel like two separate subsystems — one dim and confusing during click-to-arm, the other obscuring targets with a floating card ghost during drags. This creates cognitive friction and makes targets hard to discover.

## Solution

Render a **single animated SVG arrow** (Hearthstone/Slay-the-Spire style) that unifies both interaction modes:

- **Anchor (arrow tail):** Source position — the card slot in hand (for cast/attack) or the unit token (for unit drag)
- **Arrow head → cursor position:** Live cursor tracking via `pointermove` listener during both click-armed and active-drag states
- **Quadratic Bézier curve:** Arc upward for a "throw" aesthetic instead of a straight shot
- **Animated flowing dashes:** 0.6s linear loop (`stroke-dashoffset` animation) to telegraph "this is a trajectory, not static"
- **Color coding:** Gold when hovering a valid target, red/dimmed when over empty space or invalid

**Card stays lifted in hand** (not dimmed or cloned to cursor) during unit-targeted casts. Sprite ghost only appears for tile-placement cards (summons), where the arrow doesn't apply.

## Architecture

### Components
- `targeting-arrow.tsx` — Fixed full-screen SVG overlay, positioned relative to viewport. Computes arrow geometry via quadratic Bézier with tangent-aligned arrowhead rotation.
- Integration in `fish-mafia-game.tsx` — `computeArrow()` helper resolves anchor and target validity via `elementFromPoint`. Wired into:
  1. `pendingCard` state — new `pointermove` effect fires arrow updates during click-armed phase
  2. Drag move — `computeArrow()` called per `pointermove` during active drag
  3. Pointer-up — arrow cleared on drop

### Key Decisions
- Use **fixed overlay** (not inline SVG) to avoid layout clipping or transform hierarchy issues
- **Dual-path validity** — both card casts and unit drags share the same `highlightUnitIds` / reachable set and same `elementFromPoint` hit-testing logic
- **Ref-based cursor tracking** — refs hold latest `pendingCard`, `highlightUnitIds`, `reachable` to avoid stale closures in the imperative pointer listener

## When to Use

- **Turn-based tactics with ranged targeting** — any game where the user needs to aim at a board cell or enemy unit
- **Card-based / deck-building UIs** — when cards have targetable effects and the user should see the trajectory before commitment
- **Drag-and-drop + click-to-arm dual input** — unifies two interaction paradigms into one visual language

## When Not to Use

- Real-time action games — arrow latency will feel sluggish; use instant raycasts instead
- Mobile-first (finger) targeting — curves and fine rotations are less intuitive on touch; prefer simpler indicators
- Dense boards with massive AOE chains — arrow may become too cluttered or ambiguous about which unit is targeted

## Code Pattern

```tsx
// In main container:
const [arrow, setArrow] = useState<ArrowState | null>(null)

const computeArrow = useCallback((clientX: number, clientY: number) => {
  // 1. Resolve anchor (card slot or unit token center)
  const from = anchorFrom(`[data-card-uid="${card.uid}"]`, 0.15)
  
  // 2. Check validity via elementFromPoint
  const el = document.elementFromPoint(clientX, clientY)
  const valid = highlightUnitIds.includes(el?.dataset.unitId)
  
  // 3. Update arrow state
  setArrow({ fromX: from.x, fromY: from.y, toX: clientX, toY: clientY, valid })
}, [highlightUnitIds])

// Track cursor while card is armed (click path)
useEffect(() => {
  if (!pendingCard) return
  window.addEventListener("pointermove", (e) => computeArrow(e.clientX, e.clientY))
  return () => window.removeEventListener("pointermove", onMove)
}, [pendingCard, computeArrow])

// Also fire during drag move
const onPointerMove = (e) => {
  computeArrow(e.clientX, e.clientY)
}

// Render
{arrow && <TargetingArrow {...arrow} />}
```

## Related

- Task: Added targeting arrow unifying click-to-arm and drag feedback
- Decision: Card stays lifted during unit-targeted casts (no dimming or ghost)
- Concept: Dual-mode input reconciliation in turn-based tactics UIs
