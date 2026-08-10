---
{}
relates_to:
  - {type: references, target: wiki:specs:js-combat-vertical-slice}
---

---
title: Decision: Duelyst-Accurate Move-Then-Attack Ordering
type: decision
id: wiki:decisions:duelyst-accurate-move-then-attack-ordering
tags: [decision, combat, movement, duelyst]
---

---
title: Decision: Duelyst-Accurate Move-Then-Attack Ordering
type: decision
status: approved
tags: [decision, combat, movement, duelyst]
---

## Context
The initial implementation prevented attack unless the unit had moved (`moves_made == 0 ? reject`). This was meant to enforce "move before attack" to prevent hit-and-run. But it broke three scenarios: surrounded units can never attack (no valid move tile), ranged units must abandon position before every shot, and future summoned units adjacent to an enemy can't fight.

## Decision
Adopt Duelyst's actual rule from `entity.coffee:379-403`: attacking forces `movesMade >= attacksMade`. Concretely: after a successful attack, set `moves_made = moves_made.max(attacks_made)`. This:

- **Allows** stand-and-fight (attack without moving) — legal
- **Allows** move ? attack — legal
- **Forbids** move ? attack ? move (hit-and-run) — `moves_made` was bumped by attack
- **Forbids** attack ? move — `moves_made >= attacks_made` blocks further movement

```typescript
// After successful attack:
attacker.attacksMade += 1;
attacker.movesMade = Math.max(attacker.movesMade, attacker.attacksMade);
```

## Rationale
- Fixes surrounded soft-lock, ranged mandatory repositioning, and future summon edge cases
- No collateral damage — hit-and-run is still prevented (the attack consumes your move)
- Symmetric: applies to both player and enemy AI
- Verified against Duelyst source: `entity.coffee:398-403`

## Consequences
- Removed `MustMoveBeforeAttack` error variant entirely
- Existing tests updated: `cannot_attack_before_moving` replaced by `cannot_move_after_attacking`
- Bridge selection changed: selects any unit with actions remaining, not just unmoved units
- Bridge move keeps selection after moving (player can attack from new position)

## Related
- Duelyst source: `app/sdk/entities/entity.coffee:379-403`
- `src/engine/battle/service/engine.ts`