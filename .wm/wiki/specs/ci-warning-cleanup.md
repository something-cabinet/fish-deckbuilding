---
title: CI Warning Cleanup
type: spec
id: wiki:specs:ci-warning-cleanup
status: approved
tags: [spec, ci, quality, cleanup]
---

## Overview

Fix all clippy warnings so CI passes with `-D warnings`.

## Acceptance Criteria

- [ ] AC-1: `cargo clippy -- -D warnings` exits 0 on nightly
- [ ] AC-2: `cargo check` exits with 0 warnings
- [ ] AC-3: No barrel re-exports import unused items
- [ ] AC-4: No unused variables or mutable-variables-that-don't-need-mut
- [ ] AC-5: Cargo.toml has readme, keywords, categories metadata

## Warnings To Fix

1. `unused import: movement::*` — grid/service/mod.rs barrel
2. `unused imports: EngineError, PlayerAttackResult, start_player_turn` — battle/mod.rs barrel
3. `variable does not need to be mutable` (2 sites) — battle_scene.rs
4. `unused variable: right/bottom` — battle_scene.rs leftover from corner refactor
5. `package missing readme/keywords/categories` — Cargo.toml
6. `too many arguments (9/7)` — add_bracket function
