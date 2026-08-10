---
title: Failure: Stale Animation Snapshot in gdext Bridge Causes Phantom Re-Animation
type: concept
tags: [failure, rust, gdext, animation, sync]
status: active
---

## What went wrong
Enemies visually re-animated their movement from the previous turn every time the player moved or took any action. The enemy would "jump back" to its old position and slide to its current position, even though the game state was correct.

## Root cause
The `prev_units` HashMap stores unit positions at the start of the enemy turn for diff-based animation (slide from old position to new position). It was only saved once — at the beginning of `run_enemy_turn()` — and never invalidated afterward. Every subsequent `sync_all` call compared current positions against this stale snapshot, causing the enemy to re-animate its old move.

```
run_enemy_turn() {
    store_prev_unit_positions();  // snapshot taken here
    enemy_moves_in_state();
    sync_visuals_ref();           // correct: enemy slides from old→new
    // ... cards, draw ...
    sync_all();                   // BUG: prev_units still has old positions
                                  // enemy slides AGAIN
}

try_move_selected() {
    player_moves_in_state();
    sync_all();                   // BUG: prev_units still has old enemy position
                                  // enemy slides AGAIN during player's turn
}
```

## Prevention
After every complete `sync_all()` call, update the snapshot to match current positions. The pattern is: **snapshot → mutate → sync → invalidate snapshot**. The snapshot should only be used for one animation cycle.

```rust
fn sync_all(&self) {
    self.sync_visuals_ref();
    self.sync_ui_ref();
    self.sync_hand_ref();
}
// After sync_all completes, caller must:
self.store_prev_unit_positions();
```

This was added at 6 call sites: end of `run_enemy_turn`, `try_move_selected`, `try_attack_adjacent`, card targeting cancel, card play, and `on_replace`.

## Time lost
~30 minutes debugging + fix

## Related
- @wiki/patterns/snapshot-state-sync