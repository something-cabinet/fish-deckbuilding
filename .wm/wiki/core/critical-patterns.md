---
title: Critical Patterns
type: core
tags:
- critical
relates_to:
  - {type: relates_to, target: wiki:patterns:svelte-derived-snapshot-before-clearing}
---

---
title: Critical Patterns
type: core
tags: [critical]
---

# Critical Patterns

Promoted learnings from completed work. Read this at the start of every session via `wm-init`. These are lessons that cost the most to learn and save the most by knowing.

---

## 2026-07-27 — Test the UI Orchestration Layer, Not Just Pure Functions

**Category:** failure
**Source:** @wiki/concepts:untested-ui-orchestration-p0s
**Tags:** [testing, ui, orchestration]

All P0 bugs across BOTH architectures (roguelite and tactical RPG) lived in the untested UI wiring layer. The pure function layer had 0 bugs across 194 tests. Root cause: no integration tests for the orchestrator code that connects game logic to UI. The project's own NFR-2 was written to prevent this, but the orchestrator test suite was deleted during cleanup and not rebuilt — causing the same failure pattern to recur.

**What to do differently:** Write integration tests that script a full battle cycle (draw → play → defend → victory/death). Test the orchestration, not just the leaf functions. NEVER delete orchestrator tests without replacement. UI components should be thin — call tested controllers.

**Full entry:** @wiki/concepts/untested-ui-orchestration-p0s

---

## 2026-07-27 — Always Split Roguelite State into Run + Combat

**Category:** pattern
**Source:** @wiki/patterns:run-combat-state-split
**Tags:** [state, architecture, roguelite]

RunState persists across battles (deck, HP, gold, relics). CombatState is per-battle (hand, draw pile, turn phase). Copy the run deck into a battle deck at combat start — never modify the run deck during combat. Discard battle deck on exit.

**What to do differently:** Enforce this split from day 1. The initial flat GameState caused deck corruption. The split fixed it.

**Full entry:** @wiki/patterns/run-combat-state-split

---

## 2026-07-27 — Snapshot-Based State Sync Prevents ECS Desyncs

**Category:** pattern
**Source:** @wiki/patterns:snapshot-state-sync
**Tags:** [ecs, state, sync, event-driven]

In event-driven ECS architectures, per-field granular events (card:played → sync coins, enemy:hurt → sync HP) inevitably produce desyncs — 5 P0 bugs in this project were caused by this pattern. Switching to a single `state:changed` snapshot event after every action eliminated all of them.

**What to do differently:** Emit a full state snapshot after every action, not per-field events. The bridge/subscriber does a bulk sync from the snapshot. Keep granular events only for transient UI effects (flashes, animations).

**Full entry:** @wiki/patterns/snapshot-state-sync

---

## 2026-07-28 — Browser Game Storage: localStorage, Not Prisma/SQLite

**Category:** decision
**Source:** @wiki/decisions/browser-localstorage-persistence
**Tags:** [persistence, database, architecture]

Prisma + SQLite with better-sqlite3 imports Node native modules that cannot compile or run in a Vite browser bundle. The build only passes because tree-shaking drops the unreferenced module. For single-player browser game state (<100KB), localStorage is the correct choice — synchronous, always available, no build tooling.

**What to do differently:** Choose localStorage for client-side game persistence from the start. Reserve Prisma/SQLite for server-side tooling (admin panels, data analysis) where Node native modules are available.

**Full entry:** @wiki/decisions/browser-localstorage-persistence

---

## 2026-07-28 — Overlay `pointer-events` Rules Can Tie in Specificity and Silently Swap Winners

**Category:** failure
**Source:** @wiki/concepts/svelte-ui-overlay-pointer-events-specificity-tie
**Tags:** [css, svelte, pointer-events]

`App.svelte`'s shared `.ui-overlay > :global(*) { pointer-events: auto; }` ties in CSS specificity `(0,2,0)` with a per-screen `.map-overlay { pointer-events: none; }` (both two classes, once the Svelte scope-hash class is counted on each side). Ties resolve by cascade order, and the shared rule happened to load later — silently winning and making the entire full-screen map overlay swallow every click meant for the Excalibur canvas beneath it. No error, no warning; `getComputedStyle` was the only way to see it.

**What to do differently:** Any screen root that needs `pointer-events: none` to let clicks fall through to a canvas/game layer, while being a direct child of a shared overlay container that force-sets `auto` on `> *`, needs `!important` (or deliberately higher specificity) to guarantee it wins — don't assume "my rule looks more specific" without literally counting classes on both sides. When clicks silently no-op, verify with `getComputedStyle(el).pointerEvents` or `document.elementFromPoint(x, y)` in-browser rather than trusting the CSS as written.

**Full entry:** @wiki/concepts/svelte-ui-overlay-pointer-events-specificity-tie

---

## 2026-07-28 — Sync Excalibur Scene State on Screen Activation, Not Just Domain Events

**Category:** pattern
**Source:** @wiki/patterns/excalibur-scene-state-sync-on-activation
**Tags:** [excalibur, svelte, bridge]

`IslandScene` keeps its own denormalized copy of map state (`unlockedZoneIds`, etc.) to avoid a circular import with the Svelte state layer, synced via `bridge.syncFromState()`. That sync was wired only to in-scene domain events (`map:zoneEntered`, `map:zoneCompleted`), never to the screen transition that first activates the scene — so the scene rendered its hardcoded constructor defaults until the player did the one thing they couldn't do yet (click a locked-looking node). A chicken-and-egg deadlock, not a crash, so it was easy to misdiagnose as "state wasn't unlocked" rather than "state wasn't synced."

**What to do differently:** Any time an engine-side scene keeps a denormalized copy of app state and can be revisited after that state changed while inactive, push a fresh sync on every activation (`engine.goToScene(x).then(syncFn)`), not only on domain events fired from within the scene. `goToScene` is async — sync must be chained off its resolution, not called immediately after, or it fires before the scene's own `initialized` guard flips and gets silently dropped.

**Full entry:** @wiki/patterns/excalibur-scene-state-sync-on-activation

---

## 2026-07-28 — Snapshot a `$derived` Value Before Calling Anything That Mutates Its Dependency

**Category:** failure
**Source:** @wiki/patterns/svelte-derived-snapshot-before-clearing
**Tags:** [svelte, runes]

A Svelte 5 `$derived` rune re-evaluates synchronously the instant its dependency is mutated — even mid-function, before the next statement runs. `pendingAction.zoneId` read two lines after `clearPendingAction()` (which nulls the underlying state) crashed with `Cannot read properties of null`, because `pendingAction` had already recomputed to `null` by the time that line ran, despite the guard clause above it having passed.

**What to do differently:** In any handler that reads a `$derived` value, calls something that mutates its dependency, and needs the value again afterward — snapshot it into a local `const` right after the guard, before the mutating call. This bug is invisible at compile time and looks identical to reading a normal local variable, so it only surfaces at runtime.

**Full entry:** @wiki/patterns/svelte-derived-snapshot-before-clearing