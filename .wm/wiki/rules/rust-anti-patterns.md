---
title: Rust Anti-Patterns
type: rule
id: wiki:rules:rust-anti-patterns
status: active
tags: [rule, code-quality, rust]
---

## Rule: Rust Anti-Patterns — Beyond .clone()

Minimize or eliminate the following patterns:

### 1. No Bare `.unwrap()` and `.expect()` in Production
- Use `?`, `.unwrap_or_else()`, `.ok_or_else()?` instead
- Test code: acceptable where failure should panic
- Config parsing at startup: `.expect("...")` with descriptive message is acceptable

### 2. Avoid `"literal".to_string()`
- Use `&'static str` or `Cow<'static, str>` for static text
- `.to_string()` is acceptable when building dynamic strings from parts

### 3. Avoid Early `.collect::<Vec<_>>()` in Iterator Chains
- Keep iterator chains lazy — `.collect()` only at final consumer site
- Prefer `.fold()` over `.collect::<Vec<_>>().join()`

### 4. Prefer `?` Over Panic-Prone Shortcuts
- Every `.unwrap()` in production code should have a code review justification
- The `?` operator is the default for `Result`/`Option` propagation

### 5. No `unsafe` Unless Strictly Necessary
- Our codebase target: ZERO `unsafe` blocks outside `unsafe impl ExtensionLibrary` (required by gdext macro)

### Enforcement
```bash
# Find unwrap hotspots
rg '\.unwrap\(\)' rust/ -g '*.rs' -c
# Find string literal to_string calls
rg '"[^"]*"\.to_string\(\)' rust/ -g '*.rs'
# Find unsafe blocks (should be zero outside gdext)
rg 'unsafe\s*(fn|impl|trait|static|\{)' rust/ -g '*.rs'
```
