---
title: Sync Excalibur scene state on screen activation, not just domain events
type: memory
tags: [excalibur, svelte, bridge]
status: active
---

IslandScene's unlockedZoneIds only synced from gameState on zoneEntered/zoneCompleted events, never on first map-screen entry — chicken-and-egg lockout. Fix: `engine.goToScene('map').then(syncIslandScene)` — must await, goToScene is async. Full reference: @doc/patterns/excalibur-scene-state-sync-on-activation