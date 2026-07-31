---
title: Overworld Node Action Refresh / Multi-Display State Sync
type: memory
tags: [godot, gdext, ui, state-sync, overworld]
status: active
---

In the gdext overworld bridge, any state mutation (hero position, gold) must explicitly resync every UI element displaying it — set_text() doesn't auto-bind. Two bugs from this: entering an Enchanter/Gambler node without calling self.refresh() left the map stale; spending gold in on_confirm without calling update_hud()+sync_crafting_ui() left the HUD and panel gold labels showing different numbers. Full reference: @wiki/patterns/overworld-node-action-refresh