---
title: Overworld Node Action Refresh / Multi-Display State Sync
type: memory
tags: [ui, state-sync, overworld]
status: active
---

In any UI layer where state mutations and display updates are manual (React, DOM, or otherwise), every state mutation must explicitly resync every UI element displaying that state — set_text()/innerText doesn't auto-bind. Two bugs from this pattern: entering an Enchanter/Gambler node without calling refresh() left the map stale; spending gold in on_confirm without calling update_hud()+sync_crafting_ui() left the HUD and panel gold labels showing different numbers. Full reference: @wiki/patterns/overworld-node-action-refresh