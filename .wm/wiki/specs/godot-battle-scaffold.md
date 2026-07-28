---
title: Godot Battle Scaffold
type: spec
tags: [godot, prototype, battle, ui, approved]
status: approved
---

## Overview

Godot 4 battle scaffold using godot-rust (gdext) with TDD + Compiler-Driven Development. Core logic is pure Rust (52 tests), scene layer is thin gdext bridge. Phase 1: one battle scene — Guppy vs Debt Collector on a 6×4 Duelyst-style grid.

## Locked Decisions

- D1: Engine = **Godot 4** with Compatibility renderer (gl_compatibility) for web export
- D2: Scripting = **godot-rust gdext** (Rust cdylib, not GDScript)
- D3: Format = **6×4 grid**
- D4: Movement = **1 move action per unit, BFS path cost ≤ 2**. Orthogonal = 1, diagonal = 2
- D5: Mana = **Start with 3 mana, display-only in Phase 1**
- D6: Character selection shows **all possible move tiles** (Duelyst-style overlay)
- D7: **Grid-based logic + tweened visuals** — scale-in on placement (full position tweens deferred)
- D8: **Attack adjacency = 8-way** (Chebyshev distance 1)
- D9: **Symmetric counterattack**
- D10: **No enemy movement indicators in Phase 1**
- D11: **Node2D grid with instanced ColorRects** (24 tiles, code-generated)
- D12: **80×80 px tiles**, centered at ~(400, 180) in 1280×720 viewport

## Acceptance Criteria

- [X] AC-1: 6×4 grid renders centered at 1280×720 with alternating tile colors
- [X] AC-2: Guppy (30 HP, 2 ATK) at (0, 2); Debt Collector (10 HP, 2 ATK) at (5, 1); HP visible
- [X] AC-3: Guppy shows pulse indicator iff hasMoved == false
- [X] AC-4: BFS budget 2, ortho cost 1, diagonal cost 2; enemies block, out-of-bounds excluded
- [X] AC-5: Click highlighted tile moves Guppy, clears overlay + indicator
- [X] AC-6: Adjacent enemy shows attack highlight when selected
- [X] AC-7: Base attack + symmetric counterattack; dead units removed
- [X] AC-8: End Turn → enemy AI → player turn reset (flags, mana, turn counter)
- [X] AC-9: Enemy AI deterministic (Chebyshev min, lowest-y lowest-x tie-break)
- [X] AC-10: Battle-over banner with Restart button
- [X] AC-11: Mana HUD shows 3/3 (display-only)
- [X] AC-12: 52 cargo tests for BFS, combat, AI determinism, turn cycle

## Remaining Gaps

- D7 partial: scale-in tween on unit placement implemented; position tweens (move animation) and enemy turn event sequence deferred to Phase 2
- AC-6 partial: selecting moved-but-not-attacked hero still shows movement overlay instead of only attack highlight
- No export_presets.cfg for web export
- CI has 14 warnings (unused barrel re-exports, clippy)
- Bridge has no tests (requires Godot engine)
