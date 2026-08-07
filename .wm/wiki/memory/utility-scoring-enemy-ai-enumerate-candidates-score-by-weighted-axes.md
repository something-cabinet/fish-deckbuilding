---
title: Utility-scoring enemy AI: enumerate candidates, score by weighted axes
type: memory
tags: [ai, enemy, battle]
status: active
---

Enemy AI is one shared planner (ai.service.ts): enumerate every legal move+attack candidate via BFS, score each on named axes (damage, kill, lethal-on-hero, self-preservation, distance, ally-clustering), weight per enemy via an archetype+overrides profile, take the max. "Personality" is data, not code — new enemy behavior needs no new branches. Full reference: @doc/patterns/utility-scoring-enemy-ai