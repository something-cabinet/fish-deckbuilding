---
title: Pattern: Return-Value Bridge Sync for gdext
type: pattern
tags: [pattern, godot, rust, gdext, architecture, bridge]
status: active
---

## Problem
In gdext architectures, the bridge layer (Godot UI) needs to display what happened after a core operation: which card was played, what effect resolved, what item was crafted. If the bridge must infer this from state diffs (comparing graveyard before/after, checking mana deltas), the code becomes fragile and state-dependent.

## Solution
Make core functions return the data the bridge needs for display. The bridge calls a core function, receives the result, and uses it directly for logging, animations, and UI updates — no state inference needed.

```
// Core — returns what happened
pub fn play_enemy_cards(state: &mut BattleState) -> Vec<CardDef> {
    // mutate state, collect played cards
    played
}

// Bridge — uses returned data directly
let played_cards = battle_engine::play_enemy_cards_sync(s);
for card in &played_cards {
    self.append_log(&format!("Enemy plays {}", card.name));
    self.show_enemy_card_popup(card);
}
```

### Benefits
- **No state diffs**: The bridge never needs to compare "before vs after" snapshots to figure out what changed
- **Self-documenting**: The return type tells the bridge exactly what to display
- **Testable**: Core functions prove their output matches expectations without Godot
- **Decoupled**: The bridge can change its display logic without affecting core

### Common return types
- `Vec<CardDef>` — cards played, drawn, or crafted
- `Option<AttackResult>` — combat outcome with damage numbers
- `(CardDef, CorruptOutcome)` — card + what happened to it
- `Vec<Effect>` — effects that resolved

## When to Use
- Any bridge/core boundary where the bridge needs to display operation results
- Operations that affect multiple state fields (hard to diff)
- Turn-based systems where actions are discrete and auditable

## When Not to Use
- Real-time systems where return values would be too large per frame
- Operations where the bridge only needs to re-sync a single known field (e.g., HP change — floating number already handled)

## Related
- @wiki/specs/enemy-card-reveal-graveyard-viewer
- @wiki/concepts/gdext-bridge-pattern