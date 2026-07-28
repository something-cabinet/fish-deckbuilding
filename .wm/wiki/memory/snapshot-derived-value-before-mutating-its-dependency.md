---
title: Snapshot $derived value before mutating its dependency
type: memory
tags: [svelte, runes]
status: active
---

Reading a `$derived` rune after calling a function that mutates its dependency returns the recomputed value, not the pre-mutation one — even later in the same function. Snapshot into a local const first. Full reference: @doc/patterns/svelte-derived-snapshot-before-clearing