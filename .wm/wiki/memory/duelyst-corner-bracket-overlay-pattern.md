---
title: Duelyst Corner-Bracket Overlay Pattern
type: memory
tags: [pattern, grid, ui, duelyst]
status: active
---

Duelyst uses pixel-art corner bracket overlays (not full-tile color fills) to show movement/attack/summon/spell ranges. A 4-bit mask system (16 tiles per color) enables seamless tiling across contiguous highlighted regions. White=move, red=attack, green=summon, blue=spell. Full reference: @wiki/patterns/duelyst-corner-bracket-overlay-system