---
title: Rust CI build optimization
type: memory
relates_to:
- type: references
  target: wiki:patterns:rust-ci-caching-subdirectory
status: active
tags: [rust, ci, build, performance]
---

Key CI-specific Rust build time optimizations for fish-deckbuilding (godot-rust gdext, nightly, wasm targets):

1. **`debug = "line-tables-only"` in `[profile.dev]`** — ~20-40% faster. Full ref: @wiki/decisions/dev-profile-build-optimization.
2. **`[profile.dev.package.godot-core]` + `[profile.dev.package.godot-ffi] opt-level = 2`** — ~10-20% faster gdext codegen (target real crates, not the facade). Full ref: @wiki/decisions/dev-profile-build-optimization.
3. **`cache-workspaces: rust`** in `setup-rust-toolchain` — tells `Swatinem/rust-cache` the correct workspace so `rust/target/` gets cached. Use `cache-workspaces`, not `rust-src-dir` (which hijacks toolchain detection). Full ref: @wiki/patterns/rust-ci-caching-subdirectory.
4. **`RUSTFLAGS` env overrides `.cargo/config.toml`** — set `RUSTFLAGS` explicitly on every cargo invocation in build scripts. Full ref: @wiki/concepts/rustflags-env-overrides-config-toml (promoted to critical-patterns).
5. **`concurrency` group + `cancel-in-progress: true`** — prevents competing CI runs from cache thrash.
6. **Deploy concurrency: `cancel-in-progress: false`** — queues deploys to avoid half-deployed Vercel state.