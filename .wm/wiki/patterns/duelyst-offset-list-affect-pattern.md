---
{}
relates_to:
  - {type: references, target: wiki:specs:card-system-in-battle-deck}
---

---
title: Pattern: Duelyst-Style Affect Pattern (Offset-List AoE)
type: pattern
id: wiki:patterns:duelyst-offset-list-affect-pattern
tags: [pattern, aoe, cards, duelyst]
---

---
title: Pattern: Duelyst-Style Affect Pattern (Offset-List AoE)
type: pattern
tags: [pattern, aoe, cards, duelyst]
---

## Problem
Named AoE shapes (Cross, Square, Diamond) require new code per shape. Adding a new blast pattern means adding a new enum variant and a new match arm in the resolution logic. This doesn't scale.

## Solution
Adopt Duelyst's approach: AoE is an explicit list of `(dx, dy)` offsets from the target tile. The target tile is always included. Named patterns are just constants:

```typescript
export const PATTERNS = {
  SINGLE: [] as [number, number][],
  CROSS: [[-1,0], [0,-1], [0,0], [0,1], [1,0]],
  SQUARE_3X3: [[-1,-1], [0,-1], [1,-1], [-1,0], [0,0], [1,0], [-1,1], [0,1], [1,1]],
} as const;
```

Any shape is expressible — row, diamond, whole-board, custom — with zero new code per shape. Resolution is one function:
```typescript
function applyAffectPattern(
  target: [number, number],
  pattern: [number, number][]
): [number, number][] {
    // map offsets + always include target tile
}
```

## When to Use
- Game with multiple AoE shapes and frequent new shape additions
- Any system where blast patterns need to be data-driven

## When Not to Use
- Exactly one AoE shape that never changes (enum + match is simpler)

## Related
- Duelyst source: `app/sdk/spells/spell.coffee` — `_findApplyEffectPositions`
- Implemented in: `src/lib/game/cards/targeting.ts`