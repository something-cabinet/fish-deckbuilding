---
title: No Comments in Project Code
type: rule
tags: [rule, code-style, rust, quality]
status: active
---

## Rule: No Comments in Code — Zero. None.

No comments. Not implementation comments. Not doc comments (`///`). Not inline annotations. Zero.

If code needs a comment to be understood, it's badly named or too complex. Fix the naming or split the function.

### What to do instead
- **Choose descriptive names**: `remaining_move_budget` not `r // remaining budget`
- **Extract named functions**: `fn validate_transition() { ... }` not `// validate state transition`
- **Split large functions**: if a function needs a comment to explain a section, that section belongs in its own function with a descriptive name
- **Use types that document themselves**: `Result<(), AttackError>` says more than `// returns error if attack fails`

### Examples

```rust
// ❌ BAD — comment explaining what
// increment counter
counter += 1;

// ❌ BAD — comment explaining why, extract instead
// retry with backoff
for i in 0..3 { ... }

// ❌ BAD — doc comment that should be a function name
/// Validate the state transition
fn validate() { ... }

// ✅ GOOD — name says it all
fn validate_transition() -> Result<(), TransitionError> { ... }
```

### Enforcement
- A comment in code = a code smell. Flag in review.
- If you're tempted to write `/// Explanation`, extract a function instead.
- Exception: Zero. No exceptions.

### Rationale
Comments rot, drift from code, and create false confidence. A function with `validate_transition` as a name is always up to date, always correct, and never lies. A `/// Validates` doc comment can become wrong when the function changes and nobody updates the comment. Named functions also enable unit tests, search, and reuse.
