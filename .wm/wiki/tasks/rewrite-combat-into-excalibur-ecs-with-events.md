---
title: Rewrite combat into Excalibur ECS with events
type: task
tags:
- excalibur
- ecs
- architecture
- rewrite
status: in-review
priority: high
assignee: fixer
implementation_notes: |-
  Wikis extracted. Task itself still pending (ECS rewrite not started).
  ECS rewire complete. 3 wiki docs updated (architecture, decision, failure), 2 new pattern pages created, 2 memories saved, 1 promotion to critical-patterns. 92 tests passing.
acceptance_criteria:
- text: Game state managed through Excalibur ECS (Systems, Entities, Components) instead of pure functions + $state
  checked: false
- text: 'All existing game mechanics work: draw, sell coins, play attacks, block, interest, credit limit, sell ordering, enemy AI, keywords, effects, relics'
  checked: false
- text: Excalibur EventEmitter drives all state changes — Svelte subscribes and renders reactively
  checked: false
- text: 79 existing tests are preserved or migrated to test against Excalibur systems
  checked: false
- text: Build passes, `npm run dev` produces a playable game
  checked: false
- text: 'No regressions in combat flow: victory, death, card rewards, shop, rest, map'
  checked: false
---

Rewrite the full game state machine from pure TypeScript functions into Excalibur ECS with EventEmitter-driven gameplay. CombatController, CoinSystem, Keywords, Effects, EnemyAI, and RelicSystem become Excalibur Systems or event handlers. Svelte becomes a pure UI subscriber.