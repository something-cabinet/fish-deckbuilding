---
title: Svelte 5 $bindable boot-loop — use onCanvasReady callback
type: memory
tags: [svelte5, runes, bindable, boot, pixijs, bridge]
status: active
---

Svelte 5: don't wire a one-shot imperative init (like mounting a PixiJS app) through `$state` + `$bindable` + `bind:this` + `$effect`. The element-binding feedback loop re-runs the $effect every render, spawning a fresh bridge/listeners each cycle — surfaced as `effect_update_depth_exceeded` at boot with the UI half-working. Fix: child exposes the host via an `onCanvasReady` callback prop fired once in an `$effect`; parent guards with `if (bridge) return`. Also: never let a renderer/snapshot-sync exception propagate out of a controller `start()` before `addEventListener` lines run — wrap sync/apply calls in try/catch so input wiring always attaches (applies to `app/src/bridge/game.ts` start/handleSnapshot).