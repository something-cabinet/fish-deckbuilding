---
title: Scripted-rule layer for boss AI phases
type: task
id: wiki:tasks:scripted-rule-layer-for-boss-ai-phases
status: todo
priority: medium
tags: [ai, enemy, battle, design-ui]
acceptance_criteria:
  - text: "enemy-designer-ui spec updated with FR/AC for the Behavior editor (archetype + weight sliders), Deck card-detail view, and Artwork search/scroll-at-scale — reflecting what actually shipped"
  - text: "A closed AiCondition enum exists (e.g. HpBelow, TurnAtLeast, AllyCountBelow, HeroInRange) with zod schema support in enemy-schema.helper.ts"
  - text: "EnemyAiProfile gains an optional ordered rules: AiRule[] list, each { when: AiCondition + threshold, then: ForcedAction, once?: boolean }"
  - text: "planEnemyTurn evaluates rules in order before the utility-scoring pass; a matching rule preempts scoring for that unit this turn"
  - text: "once: true rules fire at most once per battle, tracked in GameState (not per-turn state)"
  - text: "Existing 262+ tests stay green; new tests cover rule precedence over scoring, once-semantics, and no-rules-matched fallthrough to normal scoring"
  - text: "Minimal designer UI to author rules on an enemy (condition + threshold + forced action pickers) added to EnemyCreateScreen's Behavior panel, gated to when at least one rule exists or an 'Add Rule' affordance"
  - text: "npm run build and tsc --noEmit stay green; mechanical design detector reports zero findings on changed UI files"
---

Close the gap flagged during the enemy-designer-ui AI work: utility scoring (@wiki/patterns/utility-scoring-enemy-ai) has no notion of "then do X" sequencing, so a boss that needs a scripted phase change (e.g. retreat-and-summon at 50% HP) can't be expressed as a weight. Add a narrow, ordered scripted-rule layer evaluated before the utility pass, plus minimal designer authoring for it. Also backfill enemy-designer-ui's spec with the FR/ACs for the Behavior editor, Deck card-detail view, and Artwork search/scroll that shipped this session without being specced first.