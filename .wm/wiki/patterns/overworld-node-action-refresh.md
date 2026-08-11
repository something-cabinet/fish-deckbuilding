---
{}
relates_to:
  - {type: supersedes, target: wiki:concepts:session-2026-07-31-crafting-save-hover}
---

---
{}
relates_to:
  - {type: relates_to, target: wiki:concepts:untested-ui-orchestration-p0s}
---

---
{}
relates_to:
  - {type: references, target: wiki:tasks:crafting-ui-scene-nodes}
---

---
{}
relates_to:
  - {type: references, target: wiki:tasks:crafting-ui-actions}
---

---
title: Pattern: Overworld Node Action Refresh
type: pattern
id: wiki:patterns:overworld-node-action-refresh
tags: [pattern, overworld, ui, crafting, state-sync]
---

## Problem

When an overworld map node is clicked, `on_node_click` advances heroNodeIdx to the clicked node before dispatching the node-specific action. If the node type's action handler doesn't call `self.refresh()`, the map display becomes stale — the hero icon stays at the old position, and the accessible-node highlighting (teal) still shows the old node's connections, not the new node's.

This causes "silent dead-clicks": hovering shows nodes as accessible (they match the old hero position), but clicking does nothing because the game correctly checks connections from the new hero position.

The same root cause shows up anywhere a UI layer mutates shared state (run state, hero position, gold) but only some of the UI elements displaying that state get told to redraw. DOM/React updates do not auto-bind to a data source � each display must be explicitly resynced after every mutation.

### Second instance: gold label desync across HUD and crafting panel

The overworld HUD (gold label, top-left) and the crafting panel's own header (GoldDisplay) both render run state gold, but `on_confirm` (the crafting purchase handler) only mutated `run.gold` via `spend_gold()` — it didn't call `update_hud()` or `sync_crafting_ui()` afterward. Both labels kept showing the pre-purchase gold amount until the player navigated away and back (which happened to trigger a `populate_grid`/`sync_crafting_ui` call elsewhere). The bug was invisible in isolation — either label alone looked "fine," it was only wrong relative to the other and to the actual `run.gold` value.

## Solution

Every function that mutates state feeding into more than one UI element must resync **all** of them at the same call site as the mutation — not rely on some other, unrelated redraw path to catch it up later.

| Node Type | Calls refresh? | Notes |
|-----------|---------------|-------|
| Battle/Boss | No (changes scene) | Map nodes cleared, scene switches |
| Rest | Yes | Heals, marks node as defeated |
| Shop | No | Placeholder — no action yet |
| Enchanter | **Yes** | Opens crafting panel |
| Gambler | **Yes** | Opens crafting panel |

For the gold case, `on_confirm` now calls both `self.update_hud(&ui, run)` (top-left HUD) and `self.sync_crafting_ui()` (panel header + action-button afford check) immediately after `spendGold` succeeds, instead of waiting for the next unrelated repopulate.

## When to Use

- Adding a new overworld node type that advances the hero position
- Fixing map interaction bugs where clicking appears to do nothing after a node action
- Any bridge handler that mutates a run state field (gold, HP, deck) which is displayed in more than one Label/Panel across the scene tree

## When Not to Use

- Node types that change scenes (Battle/Boss) — the map is discarded
- Node types that don't advance heroNodeIdx (not applicable to this pattern)

## Related

- @wiki/tasks/crafting-ui-scene-nodes
- @wiki/tasks/crafting-ui-actions
- @wiki/concepts/untested-ui-orchestration-p0s

## Note

A prior version of this page existed (visible via search/get) but was absent from the page-list/update index — this create call re-establishes it as a properly indexed page. If a duplicate turns up later, merge and delete the orphan.