---
title: Post-battle heal, heroMaxHp fix, per-zone encounters, AI strategy pass-through
type: task
id: wiki:tasks:post-battle-heal-heromaxhp-fix-per-zone-encounters-ai-strategy-pass-through
status: todo
priority: medium
tags: [p1, gameplay, encounters]
---

P1 batch from final validation:
1. AC-17: add ~10 HP post-battle heal on victory
2. Hero maxHp corruption: startBattle passes maxHp: runState.heroHp — current HP becomes max HP. Fix: store maxHp separately in RunState
3. Per-zone encounters: wire zone.enemyPool through to encounter selection; create/route zone-specific enemy IDs
4. AI strategy pass-through: pass encounter aiStrategy through CombatOrchestrator instead of mapping from intent
5. Shop: remove relic sales (D1 says relics gone), sell cards instead
6. Reward edge cases: claimCard should handle full deck gracefully, no half-gold on skip