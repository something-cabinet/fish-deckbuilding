---
title: Clippy CI Dead Code
type: memory
tags: [ci, clippy, rust]
---

CI runs `-D clippy::all -D warnings`, rejecting unused code, manual range checks, and `vec![]`-eligible patterns. Run `cargo clippy` locally before pushing. Use `#[allow(dead_code)]` for reserved enum variants. Full reference: @wiki/concepts:clippy-rejects-unused-reserved-code