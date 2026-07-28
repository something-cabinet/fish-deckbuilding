---
title: Rust Anti-Patterns
type: rule
tags: [rule, code-quality, rust]
status: active
---

## Rule: Rust Anti-Patterns — Beyond .clone()

Minimize or eliminate the following patterns:

### 1. No Bare `.unwrap()` and `.expect()` in Production
- Use `?`, `.unwrap_or_else()`, `.ok_or_else()?` instead
- Test code: acceptable where failure should panic
- Config parsing at startup: `.expect("...")` with descriptive message is acceptable
- Use `?` over panic-prone shortcuts — the default for `Result`/`Option` propagation

### 2. Avoid `"literal".to_string()` and `String::from("literal")`
- Use `&str` for static text
- `.to_string()` is acceptable when building dynamic strings from parts

### 3. Avoid Early `.collect::<Vec<_>>()` in Iterator Chains
- Keep iterator chains lazy — `.collect()` only at final consumer site
- Prefer `.fold()` over `.collect::<Vec<_>>().join()`

### 4. Minimize Unnecessary Allocation (Box, Heap)
- Use `enum` over `Box<dyn Trait>` for bounded variant sets
- Avoid boxing or heap-allocating data that could live on the stack
- No `unsafe` outside `unsafe impl ExtensionLibrary` (required by gdext macro)

### Enforcement
```bash
# Find unwrap hotspots by file
rg '\.unwrap\(\)' rust/ -g '*.rs' -c
# Find string literal to_string calls
rg '"[^"]*"\.to_string\(\)' rust/ -g '*.rs'
# Find unsafe blocks (should be zero outside gdext)
rg 'unsafe\s*(fn|impl|trait|static|\{)' rust/ -g '*.rs'
# Find early collects
rg '\.collect::<Vec' rust/ -g '*.rs'
```
