---
{}
relates_to:
  - {type: references, target: wiki:specs:enemy-system-deck-ai-difficulty}
---

---
title: Decision: Attack-Focused Exhaustion
type: decision
id: wiki:decisions:attack-focused-exhaustion
tags: [decision, combat, exhaustion]
---

---
title: Decision: Attack-Focused Exhaustion
type: decision
status: approved
tags: [decision, combat, exhaustion]
---

## Context
`GridUnit` needed an `exhausted()` method to signal whether a unit can still act. Two options: require both movement AND attack pools depleted (`&&`), or require only attacks depleted (Duelyst's model — `getIsExhausted() = exhausted or !getHasAttacksLeft()`).

## Decision
Attack-focused exhaustion: `exhausted() = attacks_made >= max_attacks`. A unit with remaining move but no attacks left IS exhausted. A unit with attacks but no moves left is NOT exhausted.

```rust
pub fn exhausted(&self) -> bool {
    self.attacks_made >= self.max_attacks
}
```

## Rationale
- Matches Duelyst: `entity.coffee:427: getIsExhausted: () -> (@exhausted or !@getHasAttacksLeft())`
- Attack is the primary action — move is positioning support
- A unit that can't attack but can move is tactically useless (can't end combat), so "exhausted" is accurate
- Simpler bridge logic: pulse indicator = attacks remain, selection = any action remains

## Consequences
- Summoning sickness initialization: spawn with `attacks_made = max_attacks` (not moves)
- Bridge selection uses `!exhausted()` for "can still act"
- Bridge pulse indicator uses `attacks_made < max_attacks` for "can still attack"

## Related
- Duelyst source: `app/sdk/entities/entity.coffee:427`
- `rust/src/core/grid/model/unit.rs`