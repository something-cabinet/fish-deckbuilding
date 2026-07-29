---
title: Failure: Clippy CI Rejects Unused Reserved Code
type: concept
tags: [failure, ci, clippy, rust, dead-code]
---

## What went wrong
CI failed with three clippy errors after adding the card system:
- `dead_code`: `Rarity::Legendary` variant never constructed (reserved for affix system)
- `vec_init_then_push`: `all_starter_cards()` used `Vec::new()` + repeated `push()` instead of `vec![]`
- `manual_range_contains`: manual range check instead of `(0..5).contains(&idx)`
- `never_loop`: single-iteration `for` loop that should be `if let Some()`

## Root cause
Code was written for correctness first, not clippy-clean. Local `cargo build` and `cargo test` passed because they don't run `-D warnings` clippy by default. CI runs `-D clippy::all` and `-D warnings`, treating all clippy and compiler warnings as errors.

## Prevention
- Run `cargo clippy` locally before pushing (not just `cargo build`/`cargo test`)
- For enum variants reserved for future use, add `#[allow(dead_code)]` explicitly
- Use `vec![]` macro instead of `Vec::new()` + `push()` for static lists
- Use `if let Some()` instead of single-iteration `for` loops
- Use `{range}.contains(&x)` instead of manual `>= && <` checks
- Use `Vec::with_capacity(N)` when building a vec in a loop

## Time lost
~5 minutes per CI failure cycle (push → wait → fix → push → wait)

## Related
- @wiki/concepts:ci-nightly-clippy-drift