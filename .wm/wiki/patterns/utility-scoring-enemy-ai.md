---
title: 'Pattern: Utility-Scoring Enemy AI (Enumerate-and-Score Planner)'
type: pattern
id: wiki:patterns:utility-scoring-enemy-ai
status: draft
tags:
- pattern
- ai
- enemy
- battle
- game-design
relates_to:
  - {type: extends, target: wiki:specs:enemy-designer-ui}
---

## Problem

Enemy "personality" needs to vary per enemy type (aggressive brawler, cautious skirmisher, kiting artillery) without hand-writing a new branch of movement/targeting code for every enemy, and without designers having to touch TypeScript to tune behavior. A hardcoded chase-the-nearest-target loop (the original `planEnemyTurn`) works for one archetype but doesn't scale: each new personality means new `if` branches, and special cases like "always take the lethal kill first" (spec D14) end up as bespoke pre-passes bolted onto the loop.

The naive alternatives both cost more than they're worth here: writing bespoke AI code per enemy doesn't scale past a handful of enemies: the same pathfinding/targeting bug gets fixed in N places. A full visual behavior-tree/component-graph editor is over-engineering for an action space this small (a turn is just "for each unit, pick one of ~20 candidate move+attack tuples") — it means building and maintaining an editor, a serialization format, and a debugger for a DSL, and designers still end up asking for new node types.

## Solution

One shared planner, enumerate every legal action, score each with a fixed set of named scorers, take the best. "Personality" becomes a weight vector (data), not a code branch.

1. **Enumerate** every legal `(destination tile, optional target)` pair for a unit via BFS reachable tiles × in-range targets (including "stand still, don't attack" as an explicit candidate so a unit is never forced into a bad action).
2. **Score** each candidate on a fixed, closed set of named axes (`AiScorer` enum: `DamageDealt`, `KillSecured`, `LethalOnHero`, `SelfPreservation`, `DistanceToTarget`, `AllyClustering`). Every scorer returns a raw value where **higher is always better for the enemy** — this uniform sign convention is what lets a weight be a plain multiplier instead of needing per-axis special-casing.
3. **Weight** each axis per-enemy via an `EnemyAiProfile { archetype, weights? }`. An archetype (`Brawler`, `Skirmisher`, `Artillery`, `Guardian`, `Berserker`) is just a preset vector (`ARCHETYPE_WEIGHTS`); a designer can override individual axes without touching every axis, and only the overridden axes get persisted (`isDefaultAiProfile`), so a saved profile stays a readable diff against its archetype and a later preset retune still reaches every enemy that never opted out of that axis.
4. **Pick the max**, act, mutate the local board simulation, move to the next unit (sorted by bounty = `atk + hp + tier`, per spec D13).

Implementation: `src/lib/game/battle/services/ai.service.ts` (`rankCandidates`, `planEnemyTurn`), enums/constants in `src/lib/game/units/{enums,constants,models}/ai-*`.

Two spec requirements collapse into scorer weights instead of special-cased branches:
- **D14 lethal detection** is not a separate pre-pass — it's a `LethalOnHero` scorer weighted at 1000 in every preset, which dominates the sum and reproduces "always take the kill" without an `if` anywhere.
- **FR-5b shield/heal-below-HP-threshold logic** (spec's card-play AI, not yet implemented) would similarly become a `SelfPreservation` scorer scaled by missing HP, not a branch.

Determinism (spec NFR-2) comes free: fixed BFS direction order + `Array.sort` (stable) means ties break by enumeration order, so no RNG seed is needed at all.

## When to Use

- The action space per decision is small and fully enumerable (tens of candidates, not combinatorial).
- You want non-programmer-tunable behavior (designers move sliders, not code).
- "Personality" variation is the actual goal — the same underlying rules, different priorities.
- You need to explain *why* an AI did something after the fact — utility scoring gives you `rankCandidates()`, a list of every option with its per-axis raw scores, for free. This is the debugging story a behavior tree doesn't give you as cleanly.

## When Not to Use

- The action space is not enumerable (long-horizon planning, combinatorial multi-step sequences) — that needs search (minimax, MCTS), not per-turn scoring.
- The behavior genuinely needs sequencing/state machines (boss phase changes, scripted openers) — utility scoring has no notion of "then do X". That's a separate scripted-rule layer evaluated *before* the utility pass (an ordered list of `{ when: Condition, then: ForcedAction, once? }`), not a scorer axis. Not yet built in this codebase as of 2026-08-07.
- Only one or two enemies will ever exist — hardcoding is fine, the abstraction isn't earning its cost yet.

## Related
- @wiki/decisions/utility-scoring-over-behavior-tree-for-enemy-ai — why this over a component/behavior-tree system
- @wiki/specs/enemy-system-deck-ai-difficulty — spec this implements (D13/D14; see its Implementation Note for what diverges)
- @wiki/specs/enemy-designer-ui — the designer-facing archetype/slider UI built on top of this