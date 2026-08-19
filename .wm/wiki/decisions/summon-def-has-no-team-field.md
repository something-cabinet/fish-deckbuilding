---
title: 'Decision: SummonDef carries no team field'
type: decision
id: wiki:decisions:summon-def-has-no-team-field
status: approved
relates_to:
  - {type: example_of, target: wiki:patterns:authored-unit-catalog-module}
---

## Context

The Card Design screen's "Summon" effect had exactly one hardcoded outcome: spawn a 5/2/2 "Goon" (`UnitKind.Goon`, `Team.Player`), built inline in `effects.service.ts` from a bare `GOON_DEF` object (`src/lib/game/units/data/goon-def.ts`, since deleted). Adding a Summon Design subtab (mirroring Enemy Design) required deciding what a `SummonDef` looks like — specifically whether it owns a `team`/alliance the way `EnemyDef` implicitly does (always `Team.Enemy` at spawn).

## Decision

`SummonDef` (`src/lib/game/summons/summon-def.model.ts`) carries only combat stats — `hp`, `atk`, `move`, `range`, `icon` — and no `team` field. `CardEffect`'s `summon` variant changed from the literal `{ kind: "summon"; unit: "goon" }` to `{ kind: "summon"; unit: string }`, where `unit` is a `SummonDef` id resolved via `resolveSummon()`. `effects.service.ts`'s `case "summon"` still hardcodes `team: Team.Player` at the spawn site, with a comment explaining why: `castCard` (`src/lib/game/actions/actions.service.ts`) is player-only today — nothing enemy-side plays a card despite `EnemyDef.deck` existing — so there is no caster to read a team from yet.

## Rationale

Baking `team` onto `SummonDef` would have been wrong on two counts: it doesn't match the design intent (the same "Goon" template should be summonable by either side once an enemy-cast path exists), and it would need reverting the moment that path is built. Keeping the model team-agnostic costs nothing now — the Summon Design UI simply has no team field, matching how the user described it ("its alliance depend on which side summon it") — and means the only future change needed is at the `effects.service.ts` spawn site, not the data model, schema, or UI.

## Consequences

- `wiki:specs:summon-card-system` OQ-4 ("Can summon cards target enemy side? → No") is now only true because of missing caster plumbing in `actions.service.ts`, not because of a data-model constraint. Flagged in that spec's implementation note.
- A future "enemy plays a card" feature (see `summon-card-system` D5/FR-10, `wiki:specs:enemy-system-deck-ai-difficulty`) sets `team` from the caster unit's `team` at the one `case "summon"` call site — no changes needed to `SummonDef`, `SummonDefSchema`, or `summon-create-screen.tsx`.
- The seed `summon-database.json` keeps `id: "goon"` so the pre-existing `muscle` card (`unit: "goon"` in `card-database.json`) resolves unchanged after the migration off the hardcoded `GOON_DEF`.

## Related
- @wiki/patterns/authored-unit-catalog-module
- @wiki/specs/summon-card-system