---
title: Svelte 5 one-shot init — callback prop pattern
type: memory
tags: [svelte5, pixijs, boot]
status: active
---

One-shot imperative init in Svelte 5 (PixiJS apps, bridges): use an `onCanvasReady` callback prop + `if (bridge) return` guard, NOT `$state`+`$bindable`+`bind:this`+`$effect` (that re-render loop spawns a fresh subsystem per cycle → `effect_update_depth_exceeded` at boot with dead input). Subscribe before start(); try/catch renderer sync so addEventListener always attaches. Full ref: @wiki/patterns/svelte5-one-shot-imperative-init-callback