---
title: Overlay pointer-events specificity tie broke map clicks
type: memory
tags: [css, svelte, pointer-events]
status: active
---

App.svelte's `.ui-overlay > :global(*) { pointer-events: auto; }` ties in specificity with per-screen `.map-overlay { pointer-events: none; }` and wins on cascade order, silently swallowing all clicks. Fix: `!important` on the screen-level rule. Full reference: @doc/concepts/svelte-ui-overlay-pointer-events-specificity-tie