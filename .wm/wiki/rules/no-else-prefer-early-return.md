---
title: No else — Prefer Early Return
type: rule
id: wiki:rules:no-else-prefer-early-return
status: active
tags: [rule, code-style, rust, control-flow]
---

## Rule: No `else` — Prefer Early Return

Do not use `else` blocks. Prefer early returns or guard clauses. When `else` can't be eliminated without contortions, extract a function — that means the original was too big.

### Why
- `else` creates nested scopes that increase cognitive load
- Early return flattens the happy path to the left margin
- Guard clauses make preconditions explicit at the top of a function
- `else` blocks are harder to refactor; extracting the `if` body often requires restructuring

### Preferred patterns

**Early return:**
```rust
fn validate(x: Option<i32>) -> Result<(), Error> {
    let Some(val) = x else { return Err(Error::Missing); };
    // happy path, unindented
    Ok(())
}
```

**Guard clause:**
```rust
fn process(items: &[u8]) -> Vec<u8> {
    if items.is_empty() {
        return vec![];
    }
    // rest of function
}
```

**`match` on enums:**
```rust
match phase {
    Phase::PlayerTurn => handle_player(),
    Phase::EnemyTurn => handle_enemy(),
    Phase::BattleOver => handle_end(),
}
```

**`let ... else` (allowed):**
```rust
let Some(val) = opt else { return None; };
```

### Forbidden
```rust
// ❌ else block
if condition { do_a(); } else { do_b(); }

// ❌ else-if chains — use match or extract
if a == 1 { x() } else if a == 2 { y() } else { z() }

// ❌ match on booleans to avoid else — extract function instead
match (a == 0, b == 0) { (true, true) => x, _ => y }
```

### Enforcement
```bash
# Find `} else {` patterns
rg '}\s*else\s*\{' rust/ -g '*.rs'
# Find else-if chains
rg 'else if' rust/ -g '*.rs'
```
