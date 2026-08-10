---
title: Pattern: Extract Functions Instead of Writing Comments
type: pattern
id: wiki:patterns:comment-to-function-extraction
tags: [pattern, code-quality, refactoring]
---

## Problem
Code with inline comments explaining phases, cases, or layers. Comments rot and create false confidence.

## Solution
If you need a comment to explain a block of code, extract that block into a named function. The function name replaces the comment.

### Before
```typescript
function onEndTurn(): void {
    // Phase 1: end player turn
    endPlayerTurn(this.state);
    // Phase 2: sync
    this.syncUiRef();
    // Phase 3: enemy turn
    executeEnemyTurn(this.state);
    // Phase 4: sync all
    this.syncAll();
}
```

### After
```typescript
function onEndTurn(): void {
    if (!this.endPlayerTurnIfValid()) return;
    this.syncUiRef();
    this.runEnemyTurn();
    this.syncAll();
}
```

### When it's not a clear phase
Extract anyway. If the comment says "drop shadow", call a function `add_shadow`. The function becomes the documentation — testable, searchable, refactorable.

## Related
- @wiki/rules:no-comments-in-code