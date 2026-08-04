---
title: rust-ci-caching-subdirectory
type: pattern
---

---
title: Pattern: Rust CI Caching for Subdirectory Workspaces
type: pattern
tags: [rust, ci, caching, github-actions]
---

## Problem

When using `actions-rust-lang/setup-rust-toolchain@v1` (which wraps `Swatinem/rust-cache`), the cache defaults to workspace `. -> target`. If your `Cargo.toml` is in a subdirectory (e.g. `rust/Cargo.toml`) rather than the repo root, the cache looks for `./Cargo.toml` and `./target/` — neither of which exist. Result: only `~/.cargo/registry` is cached, **not** the dependency build artifacts in `rust/target/`.

## Solution

Use `cache-workspaces` instead of `rust-src-dir`. The `cache-workspaces` input propagates directly as `workspaces:` to `Swatinem/rust-cache` without affecting toolchain detection:

```yaml
- uses: actions-rust-lang/setup-rust-toolchain@v1
  with:
    cache-workspaces: rust
```

**Do NOT use `rust-src-dir` for cache correction.** `rust-src-dir` also changes the working directory for rustup toolchain detection. If your `rust-toolchain.toml` is at the repo root (not inside the workspace subdirectory), the action will fail to find it and fall back to `stable` — a misleading silent failure.

## When to Use

- Your Rust `Cargo.toml` is anywhere other than the repo root
- You use `--manifest-path rust/Cargo.toml` in cargo commands (any subdirectory)

## When Not to Use

- `Cargo.toml` is at the repo root (default works as-is)
- Your `rust-toolchain.toml` lives inside the workspace subdirectory and you want to use `rust-src-dir` intentionally for toolchain detection scoping

## Real-world Usage

`cache-workspaces` is a documented input of `actions-rust-lang/setup-rust-toolchain@v1` (see [action.yml](https://github.com/actions-rust-lang/setup-rust-toolchain/blob/main/action.yml)).

## Related

- @wiki/core/architecture — project layout with `rust/` subdirectory
- @wiki/memory/rust-ci-build-optimization