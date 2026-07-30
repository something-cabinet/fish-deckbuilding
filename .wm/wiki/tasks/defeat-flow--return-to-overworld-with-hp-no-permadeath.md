---
title: Defeat flow — return to overworld with HP, no permadeath
type: task
tags:
- p0
- gameplay
- defeat
status: todo
priority: high
implementation_notes: '## Acceptance Criteria 1. Losing a battle returns player to overworld with current HP 2. No gold or cards lost on defeat 3. Player can re-attempt the battle or explore elsewhere 4. DeathScreen no longer triggers total wipe'
acceptance_criteria:
- text: Losing a battle returns player to overworld with current HP
  checked: false
- text: No gold or cards lost on defeat
  checked: false
- text: Player can re-attempt the battle or explore elsewhere
  checked: false
- text: DeathScreen no longer triggers total wipe
  checked: false
assignee: you
---

P0 — DeathScreen.svelte:21-24 only action is resetGame() → menu, total wipe of gold/deck/map progress. Spec AC-16: "Losing a battle returns player to overworld with current HP. No gold or cards are lost. Can re-attempt the battle or explore elsewhere."

Fix:
1. On defeat, return to map screen (not menu)
2. Preserve gold, deck, collection, zone state
3. Restore some HP (placeholder ~10 or per AC-17)
4. Allow re-attempting the battle zone