---
title: CI Import Conflict Resolution
type: spec
id: wiki:specs:ci-import-conflict-resolution
status: draft
tags: [spec, ci, imports, quality]
---

## Overview

CI fails on `cargo clippy -D warnings` due to unused `#[cfg(test)]` imports in `engine.rs`. The module-level `#[cfg(test)]` imports are redundant because the test module inside the same file imports the same types.

### Current state

```rust
// engine.rs
#[cfg(test)]
use crate::core::battle::model::BattleResult;  // Line 3 — CI says "unused"
#[cfg(test)]
use crate::core::grid::{GridState, GridUnit};  // Line 8 — CI says "unused"

#[cfg(test)]
mod tests {
    use crate::core::battle::model::BattleResult;  // Line 91 — duplicate
    // ... test code uses BattleResult::Victory
}
```

During `lib test` compilation: the module-level `#[cfg(test)]` import at line 3 is visible, but the test module at line 91+ has its own copy, so the compiler considers line 3 unused.

## Options

### A: Remove module-level `#[cfg(test)]` imports (keep in test module)
Remove lines 2-3 and 7-8. Tests get their imports from their own `use` statements at line 91+.

### B: Remove duplicate test-module imports (keep module-level)
Remove the `use crate::core::battle::model::BattleResult;` from inside the test module (line 91). The module-level `#[cfg(test)]` import already makes it available in test code.

### C: Consolidate — single `#[cfg(test)]` block with all test imports
Move all test-only imports into a single `#[cfg(test)]` block at the module level, remove them from the test module.

## Acceptance Criteria
- [ ] `cargo clippy -- -D warnings` passes on CI nightly
- [ ] No duplicate imports for the same type in the same file
- [ ] All test code compiles and passes (55 tests)
