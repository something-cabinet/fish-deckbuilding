---
{}
relates_to:
  - {type: references, target: wiki:tasks:review-and-rename-card-types-to-thematic-names}
---

---
title: Decision: FaB-Style Action Card Type
type: decision
id: wiki:decisions:fab-style-action-card-type
tags: [decision, cards, types, fab]
---

---
title: Decision: FaB-Style Action Card Type
type: decision
status: approved
tags: [decision, cards, types, fab]
---

## Context
The game initially had 4 card type categories: `attack`, `defense`, `equipment`, `recruit`. These were inherited from the prototype phase where cards had fixed roles. However, every card in the game can serve 3 purposes — sold for coins (SELL), played as an attack (PLAY), or discarded for defense (BLOCK) — making the type labels misleading. An "attack" card could be used for defense, and vice versa.

## Decision
Adopt the Flesh and Blood (FaB) TCG model where all playable cards are `action` type. The card's combat role is determined by its numeric stats (attack value, defense value) and effects/keywords, not by a type label. The type only indicates the card's category/equipment slot.

The `CardDef.type` field changed from:
```typescript
type: 'attack' | 'defense' | 'equipment' | 'recruit';
```
To:
```typescript
type: 'action' | 'gear' | 'ally';
```
Only `action` is active. `gear` and `ally` are reserved for future equipment and recruit cards.

## Rationale
- FaB's pitch system maps directly to our 3-purpose card model — cards are pitched for resources (sold for coins), played for effects, or used for defense
- Type labels were misleading — an "attack" card could be used for blocking, a "defense" card could be sold for coins
- Removing type labels simplifies the UI (no type badges, no filter dropdowns)
- Keeping `gear`/`ally` as reserved types allows future expansion without breaking changes
- FaB's model is proven at scale (10+ years of competitive TCG design)

## Consequences
- **Positive**: Card rendering simplified — no type badges, no type-based color coding
- **Positive**: New cards don't need a type label — just attack/defense values and effects
- **Positive**: Future types (`gear`, `ally`) slot in naturally
- **Neutral**: All cards visually identical in type — differentiation comes from cost, keywords, and effects (color coding needs a replacement strategy)
- **Negative**: Lost type-based visual differentiation — cards now need cost/keyword-based coloring

## Related
- @task-tasks:review-and-rename-card-types-to-thematic-names
- @wiki/specs:card-type-rework-action
- Talishar-FE: `Card.ts` — `.slim/clonedeps/repos/Talishar-FE/src/features/Card.ts`
- Talishar-FE: `ParseGameState.ts` — `.slim/clonedeps/repos/Talishar-FE/src/app/ParseGameState.ts`