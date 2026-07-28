---
title: Pattern: Snapshot a $derived value into a local before mutating its dependency
type: pattern
id: wiki:patterns:svelte-derived-snapshot-before-clearing
tags: [pattern, svelte, runes, reactivity]
---

## Problem

```ts
function confirmBattle() {
  if (!pendingAction || pendingAction.type !== 'battle') return;
  clearPendingAction(); // sets gameState.map.pendingAction = null
  const zone = getZoneById(pendingAction.zoneId); // CRASH: pendingAction is null here
```

`pendingAction` here is `const pendingAction = $derived(gameState.map.pendingAction);` — a Svelte 5 rune, not a captured plain value. Runes re-evaluate on dependency mutation, including *synchronously within the same function*, before the next statement runs. Calling `clearPendingAction()` mutates the underlying state, and the very next read of `pendingAction` in that same function sees the recomputed (now `null`) value — not the value that was true when the `if` check passed a few lines earlier.

This produced `TypeError: Cannot read properties of null (reading 'zoneId')` on every "Fight!" click.

## Solution

Capture the derived value into a local `const` immediately after the guard, before calling anything that mutates its dependency:

```ts
function confirmBattle() {
  if (!pendingAction || pendingAction.type !== 'battle') return;
  const action = pendingAction; // snapshot before clearing
  clearPendingAction();
  const zone = getZoneById(action.zoneId); // safe
  ...
}
```

## When to use
Any event handler that (a) reads a `$derived` value, (b) calls a function that mutates the rune's underlying dependency, and (c) needs to keep reading that value afterward in the same function body. This is easy to miss because it looks identical to reading a normal local variable — the bug only shows up at runtime, not at compile time.

## When not to use
If the handler doesn't need the value after the mutating call, no snapshot is needed (see `handleEvent()` in the same file, which clears and returns without touching the value again — no bug there).

## Related
- `src/ui/hud/MapOverlay.svelte` `confirmBattle()`
