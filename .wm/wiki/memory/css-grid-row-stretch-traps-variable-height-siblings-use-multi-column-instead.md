---
title: CSS grid row-stretch traps variable-height siblings — use multi-column instead
type: memory
tags: [css, layout, ui]
status: active
---

Two grid cells sharing a row always share the row's height (max-content of the tallest cell) — items-start only changes alignment within that height, it can't shrink the row. If a sibling's height changes interactively (expand/collapse) while its row-mate doesn't, switch that container from `grid grid-cols-2` to `columns-2` + `break-inside-avoid` so each item stacks independently. Full reference: @doc/concepts/css-grid-row-stretch-vs-multi-column-for-variable-height-siblings