---
title: Mafia Pixel World Replacement (supersedes VU-Meter Desk)
type: decision
status: approved
decision:
  context: "The game previously shipped a "VU-Meter Desk" instrument world (ivory meter faces, ballistic needles, walnut desk) documented in DESIGN.md and locked by wiki:specs:mafia-underworld-ui-theme D1 ("the desk world IS the debt-office"). During the overdrive session the user rejected the needle/meter aesthetic ("I thought we rework to mafia - pixel theme?") and confirmed: replace the world with a modern mafia-underworld pixel-art identity, units as sprite characters that visibly move on the 9×5 grid, Kenney CC0 pixel packs + authored unit sprites."
  rationale: "User explicitly rejected the meter/needle instrument world as not fitting the story; the Duelyst research (pixel sprites on dark boards) supports sprite-art pixel; the modern-underworld register (tailored mobsters, neon signage, wet-dark streets) matches the mafia story; Kenney CC0 keeps licensing clean; unit movement on the grid is core gameplay (Duelyst parity)."
  options: ["VU-Meter Desk instrument world (retain, overdrive as-is)", "Hybrid: desk chrome + pixel units", "Replace: modern mafia underworld pixel-art world"]
  outcome: "World replaced: wet-dark asphalt/navy street board, neon-cyan movement light, neon-amber action light, signal-red exclusive to damage/debt/defeat, pixel mobster fish units (authored sprites) walking tiles via snapshot-diff animation (300ms/tile, reduced-motion snap), Silkscreen/VT323 pixel fonts, story motifs carried (balloon/bowl/city-above), Kenney CC0 + OGA assets under app/src/assets/pixel/, engine untouched (zero diffs), 124 tests green."
---

