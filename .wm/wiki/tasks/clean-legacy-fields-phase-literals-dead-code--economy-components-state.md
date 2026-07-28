---
title: Clean legacy fields, phase literals, dead code — economy, components, state
type: task
id: wiki:tasks:clean-legacy-fields-phase-literals-dead-code--economy-components-state
status: todo
priority: medium
tags: [p1, refactor, cleanup]
---

P1 — Multiple legacy artifacts from old FaB/deckbuilder system still in the codebase:
1. Legacy economy rendered: InterestFlashZone + CoinZone in BattleHUD (mana smuggled through 'coins' field). Bridge handles interest:due/combat:defensePhase with as any casts
2. UIBattleState carries sellPile, creditUsed, creditLimit, interestDue, mapNodes, relics, allies — delete these
3. Phase literal 'play' in EnemyRowZone vs actual 'playerAction' enum value — fix mismatch
4. 'draw' and 'defense' literals floating in state.svelte.ts and bridge.ts — update to TurnPhase values
5. Dead code: GridComponents.ts (no imports), MapScene (imported never added), entities.ts, components/index.ts legacy tags, persistence.ts + db.ts (unused), zone.enemyPool/shopItems data, unreachable encounters
6. Mana labeled as 'coins' in UI — label as mana/mana bar