---
title: Defeat flow — return to overworld with HP, no permadeath
type: task
id: wiki:tasks:defeat-flow--return-to-overworld-with-hp-no-permadeath
status: todo
priority: high
tags: [p0, gameplay, defeat]
---

P0 — DeathScreen.svelte:21-24 only action is resetGame() → menu, total wipe of gold/deck/map progress. Spec AC-16: "Losing a battle returns player to overworld with current HP. No gold or cards are lost. Can re-attempt the battle or explore elsewhere."

Fix:
1. On defeat, return to map screen (not menu)
2. Preserve gold, deck, collection, zone state
3. Restore some HP (placeholder ~10 or per AC-17)
4. Allow re-attempting the battle zone