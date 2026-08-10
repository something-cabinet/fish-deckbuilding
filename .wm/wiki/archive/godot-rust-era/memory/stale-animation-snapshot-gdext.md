---
title: Stale Animation Snapshot in gdext Bridge
type: memory
tags: [gdext, animation, sync, failure]
status: active
---

After every `sync_all()` call, call `store_prev_unit_positions()` to invalidate the animation snapshot. A stale snapshot causes phantom re-animations on every subsequent sync. Full reference: @wiki/concepts/stale-animation-snapshot-gdext