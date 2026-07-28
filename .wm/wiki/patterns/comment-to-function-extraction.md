---
title: Pattern: Extract Functions Instead of Writing Comments
type: pattern
id: wiki:patterns:comment-to-function-extraction
tags: [pattern, rust, code-quality, refactoring]
---

## Problem
Code with inline comments explaining phases, cases, or layers. Comments rot and create false confidence.

## Solution
If you need a comment to explain a block of code, extract that block into a named function. The function name replaces the comment.

### Before
```rust
fn on_end_turn(&mut self) {
    // Phase 1: end player turn
    { ... battle_engine::end_player_turn(s); }
    // Phase 2: sync
    self.sync_ui_ref();
    // Phase 3: enemy turn
    ... battle_engine::execute_enemy_turn(s);
    // Phase 4: sync all
    self.sync_all();
}
```

### After
```rust
fn on_end_turn(&mut self) {
    if !self.end_player_turn_if_valid() { return; }
    self.sync_ui_ref();
    self.run_enemy_turn();
    self.sync_all();
}
```

### When it's not a clear phase
Extract anyway. If the comment says "drop shadow", call a function `add_shadow`. The function becomes the documentation — testable, searchable, refactorable.

## Related
- @wiki/rules:no-comments-in-code
