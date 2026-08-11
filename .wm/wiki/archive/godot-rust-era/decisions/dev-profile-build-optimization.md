---
{}
relates_to:
  - {type: references, target: wiki:memory:rust-ci-build-optimization}
---

---
{}
relates_to:
  - {type: relates_to, target: wiki:memory:rust-ci-build-optimization}
---

---
{}
relates_to:
  - {type: relates_to, target: wiki:memory:rust-ci-build-optimization}
---

---
{}
relates_to:
  - {type: references, target: wiki:core:architecture}
---

---
title: Decision: Dev Profile Build Optimization for gdext Projects
type: decision
id: wiki:decisions:dev-profile-build-optimization
status: approved
tags: [rust, build, performance, gdext]
---

## Context

The `godot` crate (gdext) generates large amounts of binding code via its codegen. In the default dev profile (`debug = true`), every monomorphized type emits full per-type and per-variable DWARF metadata — a significant slice of compilation wall time. Additionally, gdext's generated code is compiled at `opt-level=0` like everything else in dev mode, even though it never changes between local edits.

## Decision

### 1. Use `debug = "line-tables-only"` in `[profile.dev]`

Replaces the default `debug = true` (which emits full DWARF). Keeps file:line information for backtraces, panics, and profiler attribution. Drops per-type and per-variable debug metadata.

**Measured impact:** ~20-40% faster incremental rebuilds (Kobzol, godot-rust gdext #1587).

### 2. Use `[profile.dev.package.godot] opt-level = 2`

Optimizes only the `godot` dependency crate at `opt-level=2` even in dev builds. Reduces LLVM IR work downstream when the project crate is compiled. Has no effect on the project's own code (still opt-level=0 for fast compilation).

**Measured impact:** ~10-20% faster full rebuilds.

## Rationale

- Both changes are zero-risk: they don't change runtime behavior, only debug info detail and dependency optimization
- Proven at scale by deno, bun, polars, surrealdb, rolldown, risingwave (all use `debug = "line-tables-only"`)
- The `[profile.dev.package.*]` override is standard Cargo profile targeting
- gdext's generated code rarely changes outside of version bumps, so optimizing it even in dev mode is a net win

## Consequences

- Debugger variable inspection is reduced (no per-variable locations) — use `cargo build --config 'profile.dev.debug=2'` for a one-off full-debuginfo build
- Backtraces, panic messages, and line-level profiling still work
- CI builds are ~15-25% faster from the debuginfo change alone

## Related

- @wiki/memory/rust-ci-build-optimization