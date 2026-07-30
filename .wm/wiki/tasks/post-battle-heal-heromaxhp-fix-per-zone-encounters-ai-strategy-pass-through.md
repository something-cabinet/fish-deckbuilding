---
title: Post-battle heal, heroMaxHp fix, per-zone encounters, AI strategy pass-through
type: task
tags:
- p1
- gameplay
- encounters
status: todo
priority: medium
implementation_notes: '## Acceptance Criteria 1. Hero HP healed to (maxHp + healAmount) after battle, capped at heroMaxHp 2. heroMaxHp properly respected as ceiling for all healing 3. Per-zone encounter pools defined and selectable 4. Enemy AI strategy parameter is passed through to decision engine'
acceptance_criteria:
- text: Hero HP healed to (maxHp + healAmount) after battle, capped at heroMaxHp
  checked: false
- text: heroMaxHp properly respected as ceiling for all healing
  checked: false
- text: Per-zone encounter pools defined and selectable
  checked: false
- text: Enemy AI strategy parameter is passed through to decision engine
  checked: false
assignee: you
---

P1 batch from final validation:
1. AC-17: add ~10 HP post-battle heal on victory
2. Hero maxHp corruption: startBattle passes maxHp: runState.heroHp — current HP becomes max HP. Fix: store maxHp separately in RunState
3. Per-zone encounters: wire zone.enemyPool through to encounter selection; create/route zone-specific enemy IDs
4. AI strategy pass-through: pass encounter aiStrategy through CombatOrchestrator instead of mapping from intent
5. Shop: remove relic sales (D1 says relics gone), sell cards instead
6. Reward edge cases: claimCard should handle full deck gracefully, no half-gold on skip