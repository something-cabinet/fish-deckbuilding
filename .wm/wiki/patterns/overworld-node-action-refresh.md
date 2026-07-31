---
{}
relates_to:
  - {type: references, target: wiki:tasks:crafting-ui-scene-nodes}
---

---
title: Pattern: Overworld Node Action Refresh
type: pattern
id: wiki:patterns:overworld-node-action-refresh
status: reviewed
tags: [pattern, overworld, ui, crafting]
---

## Problem

When an overworld map node is clicked, `on_node_click` advances `hero_node_idx` to the clicked node before dispatching the node-specific action. If the node type's action handler doesn't call `self.refresh()`, the map display becomes stale — the hero icon stays at the old position, and the accessible-node highlighting (teal) still shows the old node's connections, not the new node's.

This causes "silent dead-clicks": hovering shows nodes as accessible (they match the old hero position), but clicking does nothing because the game correctly checks connections from the new hero position.

## Solution

Every node type that advances `hero_node_idx` must call `self.refresh()` after the action, so the map redraws with the correct hero position and accessible nodes.

| Node Type | Calls refresh? | Notes |
|-----------|---------------|-------|
| Battle/Boss | No (changes scene) | `self.nodes` cleared, scene switches |
| Rest | Yes | Heals, marks node as defeated |
| Shop | No | Placeholder — no action yet |
| Enchanter | **Yes** | Opens crafting panel |
| Gambler | **Yes** | Opens crafting panel |

## When to Use

- Adding a new overworld node type that advances the hero position
- Fixing map interaction bugs where clicking appears to do nothing after a node action

## When Not to Use

- Node types that change scenes (Battle/Boss) — the map is discarded
- Node types that don't advance `hero_node_idx` (not applicable to this pattern)

## Related

- @wiki/tasks/crafting-ui-scene-nodes