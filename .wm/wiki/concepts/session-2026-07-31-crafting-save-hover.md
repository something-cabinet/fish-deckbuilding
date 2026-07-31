---
title: Session 2026-07-31 Crafting/Save/Hover
type: memory
tags: [crafting, ui, hover, save, gdext]
status: active
---

---
title: Session 2026-07-31 Crafting/Save/Hover
type: memory
tags: [crafting, ui, hover, save, gdext]
layer: session
status: active
---

# Session 2026-07-31 — Crafting UI, Hover, Save/Load

> **Superseded by typed pages:** the Overworld Node Refresh finding below is now the canonical @wiki/patterns/overworld-node-action-refresh page (which also documents a second instance — gold label desync — found in a follow-up session). Prefer that page for future reference; this flat session note is kept for historical context only.

## Overworld Node Refresh
Enchanter/Gambler node clicks advance `hero_node_idx` but never called `self.refresh()`, causing the map display to desync. The hero icon stayed at the old position, accessible-node highlighting was stale, and clicking connected nodes silently did nothing in `on_node_click`. Fixed by adding `self.refresh()` to the Enchanter/Gambler branches.

## Hover Detection via Per-Child Rect
Computing card index from hardcoded slot dimensions (190x90) doesn't match actual GridContainer cell sizes. Instead, iterate children and check `get_rect()` bounds. This fixes the hover area mismatch where the highlight extended beyond the card. In gdext 0.5, `Control.get_rect()` is available but `has_point()` is not — use manual bounds check.

## Gui_input vs _input for Clicks
Moving grid click handling from `gui_input` (which consumed events) to `_input` fixed map clicks not working after closing the crafting panel. `_input` fires before `_gui_input`, so CanvasLayer UI controls cannot consume the event first. The same event reaches both `_input` and `gui_input` — handling clicks in `_input` and hover in `gui_input` is the cleanest split.

## MouseFilter on Dynamic Panels
Dynamically created Panel nodes default to `MOUSE_FILTER_STOP`. Inside a GridContainer that uses `gui_input` for hover detection, child Panels must be set to `MouseFilter::PASS` and all child Labels to `MouseFilter::IGNORE`. Otherwise clicks and hover events are consumed by the Panel/Label before reaching the GridContainer.

## Save/Load with serde
Implemented with serde_json + std::fs. Required changing `&'static str` to `String` on `CardDef.id`/`.name` and `Affix.description` since serde cannot deserialize into `&'static str`. The spec was updated to reflect actual implementation.