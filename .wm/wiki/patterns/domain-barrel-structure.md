---
title: Pattern: Domain-Driven Barrel Structure
type: pattern
id: wiki:patterns:domain-barrel-structure
tags: [pattern, rust, architecture, module-structure]
---

## Problem
Flat file organization in a Rust game crate leads to long files that mix models, services, and tests. Imports are fragile and refactoring requires touching many files.

## Solution
Organize by domain, each with its own folder, barrel mod.rs, and model/service subdirectories:

```text
domain/
  mod.rs          # barrel: pub use model::*; pub use service::*;
  model/
    mod.rs        # barrel: pub use file_a::*; pub use file_b::*;
    file_a.rs     # single type or small group of related types
    file_b.rs     # each file = one conceptual unit
  service/
    mod.rs        # barrel: pub use file_c::*;
    file_c.rs     # pure functions operating on model types
```

Key rules:
- Every module directory has a `mod.rs` barrel that re-exports all public items
- Consumers import from the domain barrel, not individual files
- Model files contain type definitions only (structs, enums, their impls)
- Service files contain business logic (pure functions)
- Split model.rs into model/ subdir when types exceed 3-4 per file
- Use `pub(crate)` for service submodules to limit visibility within the crate
- Re-export service modules at the domain level with `pub(crate) use service::module;`

## When to Use
- Game logic with clear domain boundaries (grid, combat, battle)
- Any Rust crate with 5+ source files that group by feature

## When Not to Use
- Very small crates (<5 files) — flat is simpler
- Crates where all types are tightly coupled into one domain
- Utility crates with no domain structure

## Related
- wiki-mem convention: barrel files, model/service split
- @wiki/specs:godot-battle-scaffold
