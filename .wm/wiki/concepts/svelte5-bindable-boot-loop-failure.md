---
{}
relates_to:
  - {type: references, target: wiki:patterns:svelte5-one-shot-imperative-init-callback}
---

---
title: Failure: Svelte 5 $bindable Boot Loop — effect_update_depth_exceeded
type: concept
id: wiki:concepts:svelte5-bindable-boot-loop-failure
tags: [failure, svelte5, boot, debugging]
---

# Failure: Svelte 5 $bindable Boot Loop — effect_update_depth_exceeded at Load

## What went wrong

The app rendered its engine snapshot (state flowing correctly) but **no input listeners ever attached** — keyboard dead, clicks dead, Pixi canvas placeholder stuck. The boot capture showed two load-time errors: `effect_update_depth_exceeded` (Svelte) and a Pixi `Cannot read properties of null (reading 'clear')` (cascade from destroyed Applications mid-render).

## Root cause

`App.svelte` wired bridge creation through `$state` canvasHost + DeskFrame `$bindable` prop + `bind:this` + an `$effect` that created the bridge when the host bound. The element-binding feedback loop re-ran the effect on every render, spawning a **fresh bridge + duplicate window listeners ~50 times per load** (confirmed by console instrumentation). The `$effect` loop is the `effect_update_depth_exceeded` error; the Pixi null-clear was the cascade of destroyed Applications.

The debugger's surface symptom was misleading: UI showed real state (because `game.snapshot` was set BEFORE `desk.applySnapshot` in the handler), so it looked like "engine fine, input broken" — the actual defect was upstream in the effect wiring.

## Prevention

- One-shot imperative init via a **callback prop** (`onCanvasReady`) + `if (bridge) return` guard, never `$state`/`$bindable`/`bind:this`/`$effect` for creating singletons (see @wiki/patterns/svelte5-one-shot-imperative-init-callback).
- **Subscribe before start**: `controller.subscribe(...)` before `controller.start()` so the initial synchronous snapshot reaches subscribers.
- **Never let a sync/render exception abort input wiring**: wrap `desk.applySnapshot`/`controller.start()` in try/catch so `addEventListener` lines always run.
- Instrument the boot path (console traces at start/attach/done) when "state works but input is dead" — it pinpoints exactly where `start()` aborts.
- Browser smoke pass is the only way to catch this class — unit tests with mocked renderers pass while real boot fails.

## Time lost

~90 minutes across the browser smoke pass and instrumentation (the bug was invisible to 124 green unit tests).

## Related

- @wiki/patterns/svelte5-one-shot-imperative-init-callback (the fix)
- @wiki/specs/js-combat-vertical-slice
- @wiki/core/critical-patterns — "test the orchestration" + "browser-level verification" family