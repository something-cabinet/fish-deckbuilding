---
title: No Magic Values — Use Enums and Constants
type: rule
id: wiki:rules:no-magic-values
status: active
tags: [rule, code-style, rust, quality]
---

## Rule: No Magic Values — Use Enums and Constants

Every literal string, number, or boolean embedded directly in logic must have a named binding. If the value is one of a closed set, use an enum. If it's a single constant, use `const`.

### Good
```rust
const MAX_RETRIES: u32 = 3;
const TILE_SIZE: i32 = 80;

enum Faction { Hero, Enemy }
```

### Forbidden
```rust
// ❌ magic number
if retries > 3 { ... }

// ❌ magic string
let path = ".wm/config.json";

// ❌ inline literal in comparison
if status_code == 404 { ... }

// ❌ magic boolean parameter
process(true);
```

### Exceptions
- `0` and `1` in index/math contexts (`array[i + 1]`, `counter += 1`)
- Test assertions where the literal IS the expected value
- Format strings in `format!`/`println!`
