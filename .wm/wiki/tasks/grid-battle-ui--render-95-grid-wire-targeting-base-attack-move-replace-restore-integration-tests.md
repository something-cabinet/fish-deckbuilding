---
title: Grid Battle UI — render 9×5 grid, wire targeting, base attack, move, replace, restore integration tests
type: task
id: wiki:tasks:grid-battle-ui--render-95-grid-wire-targeting-base-attack-move-replace-restore-integration-tests
status: todo
priority: high
tags: [p0, ui, combat, grid]
---

P0 — Battles are unwinnable through the UI. Attack/Summon cards no-op without a target position. Base attack, movement, and replace are unreachable. No grid is rendered anywhere — BattleHUD still shows old deckbuilder enemy-row layout. CombatOrchestrator.getStateSnapshot() contains no grid/units/positions.

Fix:
1. Render the 9×5 grid in Svelte (tile grid + corner-bracket overlays from public/sprites/overlays/)
2. Add grid/units/positions to CombatOrchestrator.getStateSnapshot()
3. Add moveUnit/baseAttack/targeted playCard to the orchestrator
4. Wire tile clicks → targeting
5. Add Replace button to BattleHUD
6. Restore orchestrator-level integration tests (the deleted 457-line suite) per NFR-2

ACs: AC-3, AC-4, AC-7, FR-3, FR-4, FR-9