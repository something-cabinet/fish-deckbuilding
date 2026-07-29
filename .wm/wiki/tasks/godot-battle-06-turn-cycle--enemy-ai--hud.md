---
title: [godot-battle-06] Turn cycle + enemy AI + HUD
type: task
id: wiki:tasks:godot-battle-06-turn-cycle--enemy-ai--hud
status: done
superseded_by: Turn cycle + AI + HUD wired in Rust bridge (battle_scene.rs:on_end_turn, run_enemy_turn, sync_ui_ref) — end turn → enemy AI → reset flags, mana crystals, turn label, end turn button disable. AC-8, AC-9, AC-11 fulfilled.
priority: medium
tags: [from-spec, spec:godot-battle-scaffold, godot, turn, ai]
spec: wiki:specs:godot-battle-scaffold
acceptance_criteria:
  - text: "AC-8: End Turn → input locked → villain AI → player turn reset (hasMoved/hasAttacked, mana 3/3, turn+1)"
  - text: "AC-9: Villain AI: if adjacent → attack; else move budget 2 toward Guppy (Chebyshev min, lowest-y lowest-x tie-break)"
  - text: "AC-11: Mana HUD shows 3/3 at each player-turn start (display-only)"
---

Turn state machine (PLAYER_TURN → ENEMY_TURN → PLAYER_TURN). End Turn button. Enemy AI integration (deterministic move toward hero, attack if adjacent). Mana display (3/3, display-only). Reset flags on turn transition.