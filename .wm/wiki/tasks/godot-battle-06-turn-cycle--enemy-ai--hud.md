---
title: [godot-battle-06] Turn cycle + enemy AI + HUD
type: task
id: wiki:tasks:godot-battle-06-turn-cycle--enemy-ai--hud
status: todo
priority: medium
tags: [from-spec, spec:godot-battle-scaffold, godot, turn, ai]
spec: wiki:specs:godot-battle-scaffold
acceptance_criteria:
  - text: "AC-8: End Turn → input locked → villain AI → player turn reset (hasMoved/hasAttacked, mana 3/3, turn+1)"
  - text: "AC-9: Villain AI: if adjacent → attack; else move budget 2 toward Guppy (Chebyshev min, lowest-y lowest-x tie-break)"
  - text: "AC-11: Mana HUD shows 3/3 at each player-turn start (display-only)"
---

Turn state machine (PLAYER_TURN → ENEMY_TURN → PLAYER_TURN). End Turn button. Enemy AI integration (deterministic move toward hero, attack if adjacent). Mana display (3/3, display-only). Reset flags on turn transition.