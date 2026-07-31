---
{}
relates_to:
  - {type: supersedes, target: wiki:decisions:godot-rust-gdext-pivot}
---

---
title: Decision: JS Is the Real Platform Going Forward
type: decision
id: wiki:decisions:js-is-the-real-platform
status: approved
tags: [decision, js, stack, platform]
---

# Decision: JS Is the Real Platform Going Forward (Vite + TS + Svelte 5 + PixiJS)

## Context

The game previously pivoted from Excalibur.js/Svelte to Godot 4 + godot-rust (gdext) — that stack is implemented on `main`. On the `investigate/js-games` branch, a working JS vertical slice (grid combat, VU-Meter Desk) was built. The user confirmed: **"JS is the real platform going forward"** — not a throwaway spike.

## Decision

The JS stack is the committed platform: Vite + TypeScript + Svelte 5 (runes) for the UI layer + PixiJS v8 for the canvas layer, with a pure TS engine as the single source of truth (no framework dependencies). The Godot 4 + godot-rust stack is retired for this branch.

## Rationale

- TypeScript gives compiler-driven development (enums for Faction/Phase/Decision, Result-style PlayResult) — the same property that motivated the Rust pivot.
- Svelte 5 runes + PixiJS split matches the architecture: DOM UI for hand/log/meters, canvas for board/units/needles.
- Vitest on the pure engine + orchestration tests covers the untested-UI-layer failure mode that caused all historical P0s.
- Web deploy pipeline (Vite static build) is simpler than the Godot headless export chain.

## Consequences

- The wiki's Godot/Rust-era specs and memory entries remain valid as design intent and historical context; tech references should be read as "JS/TS equivalent" (matching how the Excalibur-era refs were handled).
- `rust/`, `godot/`, `docs/` were removed on this branch; `main` retains them.
- DESIGN.md, PRODUCT.md, and the approved spec `wiki:specs:js-combat-vertical-slice` document the committed world.

## Related

- @wiki/specs/js-combat-vertical-slice
- @wiki/decisions/godot-rust-gdext-pivot (superseded direction for this branch)
- @wiki/memory/godot-migration-analysis-stay-on-web-stack (archived — earlier analysis, overridden)