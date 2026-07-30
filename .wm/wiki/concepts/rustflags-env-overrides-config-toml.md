---
{}
relates_to:
  - {type: relates_to, target: wiki:decisions:dev-profile-build-optimization}
---

---
{}
relates_to:
  - {type: relates_to, target: wiki:patterns:rust-ci-caching-subdirectory}
---

---
title: Failure: RUSTFLAGS Env Variable Overrides .cargo/config.toml in CI
type: concept
id: wiki:concepts:rustflags-env-overrides-config-toml
tags: [rust, ci, failure, build]
---

## What went wrong

The `actions-rust-lang/setup-rust-toolchain@v1` action exports `RUSTFLAGS=-D warnings` into the job environment by default. On the surface this is fine — it enforces warning-free builds. But `RUSTFLAGS` as an env variable has highest precedence in Cargo's flag resolution: when present, it causes Cargo to **completely ignore** `target.*.rustflags` from `.cargo/config.toml`.

For the `build-web.sh` script, the first (threads) build set `RUSTFLAGS` per-command, duplicating all config flags plus pthread/atomics — this worked. But the **second (nothreads) build omitted the `RUSTFLAGS` prefix**:

```bash
# This inherited RUSTFLAGS=-D warnings from CI, losing all config.toml flags
cargo build --release --features nothreads -Zbuild-std --target wasm32-unknown-emscripten
```

This meant in CI, the nothreads wasm was linked **without** `-sSIDE_MODULE=2` (not a proper side module), with wasm exception handling enabled (`-Z emscripten-wasm-eh` defaults), and without `default-visibility=hidden`. The artifact was structurally broken — but the threaded build (the primary one) was fine, so the issue could pass unnoticed until someone tested in a browser without cross-origin isolation.

## Root cause

Cargo's flag precedence: `RUSTFLAGS` env > `target.<cfg>.rustflags` in config.toml > `build.rustflags`. When `RUSTFLAGS` is set in the environment, all config.toml rustflags are silently dropped. This is documented but easy to miss, especially when the env var is set implicitly by a CI action.

## Prevention

Scripts that rely on `.cargo/config.toml` settings must be self-contained in CI. Extract the shared flags into a variable and set `RUSTFLAGS` explicitly for **all** cargo invocations in the script, not just the first one:

```bash
WASM_RUSTFLAGS="-C link-args=-sSIDE_MODULE=2 \
-C llvm-args=-enable-emscripten-cxx-exceptions=0 \
-Z default-visibility=hidden \
-Z link-native-libraries=no \
-Z emscripten-wasm-eh=false"

# Threads build: add pthread/atomics
RUSTFLAGS="$WASM_RUSTFLAGS -C link-args=-pthread -C target-feature=+atomics" \
cargo build --release -Zbuild-std --target wasm32-unknown-emscripten

# nothreads build: just the shared flags
RUSTFLAGS="$WASM_RUSTFLAGS" \
cargo build --release --features nothreads -Zbuild-std --target wasm32-unknown-emscripten
```

Also consider adding an explicit `RUSTFLAGS` override to `setup-rust-toolchain` if you manage rustflags through config.toml:

```yaml
- uses: actions-rust-lang/setup-rust-toolchain@v1
  with:
    rustflags: ''    # prevents the action from setting RUSTFLAGS
```

## Time lost

~30-60 minutes if this shipped broken and had to be diagnosed post-deploy. Caught by Oracle review during code review — zero wasted time in this case.

## Related

- @wiki/patterns/rust-ci-caching-subdirectory
- @wiki/decisions/dev-profile-build-optimization