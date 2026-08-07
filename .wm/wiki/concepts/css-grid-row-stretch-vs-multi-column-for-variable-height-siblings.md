---
title: 'Failure: CSS Grid Row-Stretch Strands Blank Space Next to a Shorter Sibling'
type: concept
id: wiki:concepts:css-grid-row-stretch-vs-multi-column-for-variable-height-siblings
status: draft
tags:
- failure
- css
- layout
- ui
relates_to:
  - {type: references, target: wiki:specs:enemy-designer-ui}
---

## What went wrong

Two-column form panels in this app (`enemy-create-screen.tsx`, `ai-profile-editor.tsx`) use `grid grid-cols-2` to lay out fields side by side. When one cell's content can expand at runtime (e.g. a collapsible per-slider explanation toggled open) while its row-mate stays short, the grid row grows to the height of the tallest cell — that's correct CSS Grid behavior — but the *shorter* cell was left with a visible dead rectangle underneath its own content, because the row height is shared by definition.

The first fix attempt, adding `items-start` to the grid container, did not help. `items-start` only changes how a cell's content is positioned *within* its allotted cell height (top-aligned instead of stretched/centered) — it does not change the fact that the row itself is exactly as tall as its tallest member. The blank space just moved from "centered around short content" to "below short content"; it didn't disappear.

Also hit once before this session, independently: the very first version of the enemy-designer top section (Identity/Stats/Deck/Artwork panels) had the same shape — Deck/Artwork sat in a flex column much shorter than Identity/Stats/Behavior's column, leaving a large permanent blank rectangle. That one was fixed by regrouping into a `grid` with `items-start` — which *does* work for that case, because there the mismatch was between the whole grid's implicit rows (each panel effectively its own row), not between two cells forced to share one row.

## Root cause

`items-start` fixes intra-cell alignment. It cannot fix inter-cell row-height coupling — that only happens when two elements are literal siblings in the *same grid row* and one is taller than the other at some point in time (not just at initial render). A CSS Grid row's height is `max-content` over every cell assigned to that row; no `align-items` value changes that.

## Prevention

- If two grid cells can be at *different, changing* heights **at the same time** (not just "shorter panel, taller panel" as separate row-things but "these two literally sit in the same row and one might grow"), use CSS multi-column flow instead of `display: grid`: `columns-2 gap-x-6` on the container, `break-inside-avoid` + a bottom margin on each item. Columns let each item stack independently down its own column — no shared row height.
- `items-start` on a grid *is* still the correct fix when the mismatch is across independent panels/rows that don't change height relative to each other after mount (the Identity/Stats/Deck/Artwork case). Reach for columns specifically when a sibling's height is expected to change interactively (collapse/expand, "show more", async content) while its row-mate doesn't.
- Reading-order caveat: CSS multi-column flow is column-major (fills column 1 top-to-bottom, then column 2), not row-major like grid. For the 6-slider case this reordered which sliders sit "next to" which — acceptable here since all 6 are equally scannable in any order, but check this before reaching for columns on content where left-right adjacency carries meaning.

## Time lost

~10 minutes: one screenshot round-trip to notice the gap, one wasted `items-start` attempt that needed its own re-screenshot to disprove, then the columns fix. Cheap this time only because a screenshot-driven workflow was already in place; worth remembering ahead of time.

## Related
- @wiki/specs/enemy-designer-ui — the screen this was found on
- @task (none — found live while replying to direct user feedback "make font bigger, hide slider explanations behind a button", not a tracked task)