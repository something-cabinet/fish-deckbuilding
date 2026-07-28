---
title: Pattern: Push Svelte state into Excalibur scene on activation, not just on domain events
type: pattern
id: wiki:patterns:excalibur-scene-state-sync-on-activation
tags: [pattern, excalibur, svelte, bridge, map]
---

## Problem

`IslandScene` (Excalibur) keeps its own runtime copy of map state (`unlockedZoneIds`, `currentZoneId`, `completedZoneIds`) rather than reading `gameState.map` directly, to avoid a circular import between the Excalibur scene layer and the Svelte state layer. The bridge (`src/game/bridge.ts`) pushes updates into the scene via `scene.syncFromState(...)`.

That push was only wired to two domain events — `map:zoneEntered` and `map:zoneCompleted` — both of which only fire *after* the player has already successfully clicked into a zone. There was no sync on the very first transition into the map screen (menu → dialogue → map, or any `setScreen('map')`). Result: the scene rendered its hardcoded constructor defaults (`unlockedZoneIds = new Set(['guppy_cove'])`) until the player did the one thing they couldn't do yet (click a node) — a chicken-and-egg deadlock that looked like "nodes don't unlock" or "clicks don't work."

## Solution

Sync scene state explicitly whenever the screen transitions **to** the scene, not only on in-scene domain events:

```ts
// bridge.ts
export function syncIslandScene(): void {
  if (islandSceneRef && gameStateRef) {
    islandSceneRef.syncFromState(gameStateRef.map);
  }
}
```

```svelte
<!-- App.svelte -->
case 'map':
  engine.goToScene('map').then(syncIslandScene); // must await — goToScene is async
  break;
```

**Critical gotcha:** `Engine.goToScene()` is `async` and resolves after the scene's `onInitialize()` runs (which flips the scene's own `initialized` guard flag). Calling the sync function synchronously right after `goToScene(...)` (without `.then`/`await`) fires it *before* the scene's `initialized` flag is set, so `syncFromState`'s own guard (`if (!this.initialized) return;`) silently no-ops it — same bug, just moved one level down. Always chain sync calls off the resolved promise.

## When to use
Any time a game-engine scene keeps its own denormalized copy of app state (to avoid circular imports or for engine-thread isolation) and that scene doesn't always start from a "fresh" state — i.e., whenever the scene can be revisited after the underlying state changed while it was inactive.

## When not to use
If the scene is always freshly constructed per visit (no persistent internal state), or if the scene reads shared state directly with no import-cycle constraint, this indirection is unnecessary.

## Related
- `src/game/scenes/IslandScene.ts` (`syncFromState`, `this.initialized` guard)
- `src/game/bridge.ts` (`syncIslandScene`)
- `src/App.svelte` (screen-transition `$effect`)
