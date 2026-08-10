---
title: Godot Migration Analysis — Stay on Web Stack
type: memory
tags:
- decision
- architecture
- godot
- excalibur
status: archived
implementation_notes: 'Superseded: the "stay on web stack" recommendation was overridden — the project migrated to Godot 4 + godot-rust (gdext) per wiki:decisions:godot-rust-gdext-pivot and shipped wiki:specs:godot-battle-scaffold. Kept for historical record of the analysis that preceded the reversal; do not follow its conclusion.'
---

# Decision: Stay on Excalibur.js + Svelte, Do Not Migrate to Godot

**Date:** 2026-07-28
**Source:** Oracle strategic analysis on branch `investigate-godot`

## Core Finding
The migration fails every decision test: game is 90% built and fully tested (236 tests), genre (turn-based tactical RPG) has zero engine demands, primary target (web browser) is what Godot serves worst and web stack serves best, team is TypeScript developers.

## Key Evidence
- Excalibur-specific code is only ~623 lines total (IslandScene.ts 303, BattleScene.ts 61, engine.ts 28, events.ts 64)
- BattleScene renders ONLY a background color — the grid is 100% Svelte CSS Grid
- All 88 SVGs are consumed by Svelte `<img>` tags, not Excalibur
- Game already de-facto migrated off Excalibur (battle UI → Svelte, sprites → Svelte, logic → pure TS)

## What to do instead (2-4 days, vs 6-10 weeks for Godot)
1. Port IslandScene (303 lines) to a Svelte SVG component — eliminates the sync seam that caused all map bugs (30 playtest screenshots documented this)
2. Delete Excalibur entirely — replace EventEmitter with ~30 lines of typed emitter, remove excalibur + spritefusion deps
3. Remove dead Prisma/better-sqlite3 dependencies
4. Keep animation strategy as-is (CSS keyframes + Svelte components)

## Migration Cost (if ever revisited)
- 6-10 weeks to parity
- All pure logic (~5-6k lines) must be hand-ported to GDScript/C#
- 236 tests must be ported (they're the behavioral spec)
- Godot web export: ~30-40MB uncompressed, no mobile browser support, cross-origin-isolation required
- Current dist/ is 1.0MB, instant load, works everywhere

## Conclusion
Finish the migration already started (to pure Svelte + pure TS), delete Excalibur, fix the 3 P0s, and ship the game.