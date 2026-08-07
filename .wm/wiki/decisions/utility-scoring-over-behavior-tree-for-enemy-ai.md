---
title: 'Decision: Utility Scoring Over Behavior-Tree/Component System for Enemy AI'
type: decision
id: wiki:decisions:utility-scoring-over-behavior-tree-for-enemy-ai
status: approved
relates_to:
  - {type: relates_to, target: wiki:patterns:utility-scoring-enemy-ai}
---

## Context

The user asked, ahead of any implementation, how to approach enemy AI now that cards/enemies/stages design was in place: write bespoke code per enemy, build a component/behavior-tree system so designers can author it themselves, some hybrid, or something else. Three options were on the table:

1. **Code per enemy** — write custom TS logic for each enemy type.
2. **Full component/behavior-tree system** — a visual editor, node graph, designer-authored behavior DSL.
3. **Utility-scoring hybrid** — one shared enumerate-and-score engine, personality expressed as data (weights), narrow scripted-rule escape hatch reserved for bosses only.

## Decision

Option 3: a single utility-scoring planner shared by every enemy, tuned per enemy by a weight vector over a fixed, closed set of scorers. No node-graph editor. Reserve an optional `aiHookId` escape hatch to a registered TS function for the rare boss that needs genuinely bespoke logic (not built yet as of 2026-08-07).

## Rationale

The deciding factor: **the action space per enemy turn is small and fully enumerable** (BFS reachable tiles × in-range targets, maybe 10-30 candidates). When every option can be listed, scoring them beats authoring control flow — you get one engine to debug instead of N behavior graphs that each fail differently.

Trade-offs considered:
- **Code per enemy** is the fastest path for the first few enemies and the worst at 20+: the same pathfinding/targeting bug needs fixing in every enemy's file, and there's no way for a non-programmer to iterate.
- **Full behavior-tree/component system** gives designers total authorial power but means building and maintaining an editor, a serialization format, and a debugger for a DSL — and designers still end up asking for new node types the moment they want something the graph can't express. That's a large fixed cost for an action space this simple.
- **Utility scoring** lands in between: designers get real control (archetype presets + per-axis sliders) without an editor; two spec requirements that looked like special cases (D14 lethal detection, and the not-yet-built FR-5b shield/heal-below-HP threshold) turned out to collapse into scorer weights instead of needing dedicated branches, which was not obvious going in and is a strong signal the model fits the domain.

The main thing given up: sequencing. Utility scoring has no notion of "do X, then Y" — a boss that needs to retreat-then-summon-then-resume can't be expressed as a weight. That's accepted as a known gap, deferred to a future narrow scripted-rule layer (an ordered list of forced actions gated by conditions, evaluated before the utility pass) rather than solved by the general engine.

## Consequences

- Designer surface for AI tuning is an archetype dropdown + a handful of sliders (@wiki/specs/enemy-designer-ui), not a graph editor — cheap to build, cheap to maintain, but bosses needing scripted phases aren't served by it yet.
- Every enemy shares one planner (`ai.service.ts`); a bug or improvement there benefits every enemy at once, but also means every enemy is coupled to that engine's assumptions (enumerable action space, per-turn scoring, no cross-turn memory).
- `rankCandidates()` gives free decision introspection (every candidate's raw per-axis scores) — useful for debugging and for a future "why did it do that" designer-facing view — which a behavior tree would not have given as directly.
- If a future enemy genuinely needs multi-step sequencing, the honest fix is the scripted-rule layer or the `aiHookId` escape hatch, not stretching a scorer to fake state.

## Related
- @wiki/patterns/utility-scoring-enemy-ai — the mechanism this decision produced
- @wiki/specs/enemy-system-deck-ai-difficulty — D11 ("same AI, scaled stats") is generalized by this decision into "same engine, per-enemy weights"