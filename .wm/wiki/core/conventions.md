---
title: Fish Roguelite Deckbuilding — Conventions
type: core
tags: [core, conventions]
---

---
title: Fish Tactical RPG — Conventions
type: core
tags: [core, conventions]
---

# Conventions

## Development Workflow

### SDD — Spec First
Everything has a spec before code. Lock decisions via Socratic exploration, define ACs, then implement.
```bash
# Create a new spec
wm-spec
# Plan from spec
/wm-plan --from @doc/specs/<name>
```
@wiki/rules/spec-driven-development

### TDD — Red-Green-Refactor / Compiler-Driven Development
All game logic starts with a failing test in the pure Rust core. The Rust type system (enums for Faction/Phase/Decision, `Result` for fallible operations) catches rule violations at compile time before tests even run.
```bash
cd rust
cargo test                # run all core tests
cargo clippy -- -D warnings
```
@wiki/rules/tdd

## Code Conventions

**Game logic (pure Rust)**: lives in `rust/src/core/{battle,combat,grid}/`, split into `model/` (types, no logic) and `service/` (pure functions operating on models). Zero Godot dependencies — testable standalone via `cargo test`.

**gdext bridge**: `rust/src/bridge/` contains `#[derive(GodotClass)]` nodes (e.g. `battle_scene.rs`) that read Godot input/signals, call into the pure core, and write results back to scene state. Godot (scenes, nodes, signals) never appears inside `core/`.

**GDScript**: used for:
- A minimal shim (`extends BattleScene`) in scene files where required
- **UI node wiring** — `@export var` declarations on UI scene scripts that expose node references to the Rust bridge. No game logic in these scripts — only exported variable declarations.
- All real game logic remains in Rust via gdext

**Input handling**: use `_input()`, not `_unhandled_input()`, for click input in gdext nodes — see wiki:memory:gdextension-click-input-use-_input-over-_unhandled_input.

**Hot reload**: Rust `cargo build` produces a cdylib Godot loads via `battle.gdextension`; signal reconnection on reload has known gotchas — see wiki:memory:gdext-hot-reload-pattern and wiki:tasks:godot-battle-07-hot-reload-fixes.

**Testing**: `cargo test` on the pure core. Bridge/scene layer has no automated tests (requires the Godot engine); bridge-layer test helpers (`#[func] test_click`, `debug_state`) exist for manual/in-editor verification.

## Wiki Structure

| Type | Directory | Purpose |
|------|-----------|---------|
| `core` | `wiki/core/` | Core docs (README, ARCHITECTURE, CONVENTIONS, critical learnings) |
| `task` | `wiki/tasks/` | Actionable work units |
| `spec` | `wiki/specs/` | Requirements + locked decisions |
| `rule` | `wiki/rules/` | Project rules |
| `decision` | `wiki/decisions/` | ADRs |
| `pattern` | `wiki/patterns/` | Reusable solutions |
| `concept` | `wiki/concepts/` | General docs |
| `memory` | `wiki/memory/` | Quick-recall summaries |
| `howto` | `wiki/howto/` | Step-by-step guides |
| `reference` | `wiki/reference/` | Reference material |

All pages use YAML frontmatter with `type` matching the directory. Pages are linked via `@wiki/<type>/<slug>` references.

## Golden Rules

1. **Spec first** — never write code without a spec
2. **Test first** — never implement without a failing test (`cargo test`)
3. **Pure core** — domain logic in `rust/src/core/` has zero Godot dependencies
4. **Bridge is thin** — `rust/src/bridge/` only translates between Godot and the pure core, no game rules
5. **No GDScript for logic** — GDScript is a shim only; all real logic is Rust via gdext
6. **Model/service split** — each domain module separates data types (`model/`) from behavior (`service/`)
7. **Compiler-driven** — prefer enums/`Result` over runtime checks to make illegal states unrepresentable

Note: this file previously described the retired Excalibur.js/Svelte/TypeScript stack (FaB-style `action` card type, run/combat `$state` split, CSS variable theming, Vitest). Those conventions applied to code that no longer exists post-pivot (see wiki:decisions:godot-rust-gdext-pivot); design intent for cards/state may still apply and should be re-targeted at the Rust core when implemented there.
