---
title: Duelyst-Accurate Move-Attack Ordering
type: memory
tags: [decision, combat]
status: active
---

Attack consumes move (moves_made = max(moves_made, attacks_made)). Stand-and-fight legal, move-after-attack forbidden. Fixes surrounded/ranged/summon edge cases. Full reference: @wiki/decisions/duelyst-accurate-move-then-attack-ordering