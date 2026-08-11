---
title: Failure: CI Nightly Clippy Drift
type: concept
id: wiki:concepts:ci-nightly-clippy-drift
tags: [failure, ci, clippy, rust]
---

## What went wrong
CI failed with `clippy::for_kv_map` warning that local nightly (1.96.0-nightly from March 2026) didn't catch. Local clippy passed clean with `-D warnings` but CI nightly had a new lint.

## Root cause
Nightly Rust evolves independently. CI fetches the latest nightly at runtime, which may have new clippy lints not present in the local developer's nightly.

## Prevention
- Run `cargo clippy -- -D warnings` locally before pushing
- When CI fails on a clippy lint not seen locally, the fix is almost always mechanical (like `values_mut()` instead of `iter_mut()`)
- Consider pinning CI to a specific nightly version instead of `latest`
- Or use stable for clippy and only use nightly for wasm builds

## Time lost
~15 minutes debugging the CI failure.

## Related
- @wiki/rules:rust-anti-patterns
- @wiki/specs:ci-warning-cleanup
