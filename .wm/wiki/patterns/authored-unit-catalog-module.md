---
title: 'Pattern: Authored Unit-Catalog Module'
type: pattern
id: wiki:patterns:authored-unit-catalog-module
status: draft
tags:
- pattern
- design-tool
- persistence
- characters
- units
- summons
relates_to:
  - {type: references, target: wiki:specs:enemy-designer-ui}
---

## Problem

Each new "authored unit template" domain (characters, enemies, summons) needs the same plumbing: a TS model, JSON-backed storage, a schema that can't silently drift from the TS type, a dev-only CRUD API route, and a Game Design tool screen to author it. Building this ad hoc each time risks inconsistent conventions (id slugging, fallback behavior, drift guards) and duplicated bugs.

## Solution

A fixed six-piece shape per domain, established by `characters` (`src/lib/game/characters/`) and repeated exactly for `summons` (`src/lib/game/summons/`):

1. **`<domain>-def.model.ts`** — plain TS interface. Only include fields the concept truly always has — don't bake in ownership/team unless every instance of the domain has a fixed one (`EnemyDef` has none because kind implies `Team.Enemy` at spawn; `CharacterDef` has none because it's always `Team.Player`; `SummonDef` deliberately has none because the same template can be cast by either side — see `wiki:decisions:summon-def-has-no-team-field`).
2. **`data/<domain>-schema.helper.ts`** — a Zod object schema plus a compile-time drift guard: `type _Equal<A,B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false` and `const _schemaXMatchesTsX: _Equal<TsType, InferredType> = true`. Any divergence between the Zod schema and the TS interface becomes a compile error instead of a silent runtime one.
3. **`data/<domain>-database.json`** — the design tool's on-disk storage, validated at module load via `<Domain>PackSchema.parse(...)` so a hand-edited or malformed entry throws at import time, not mid-run.
4. **`<domain>-library.ts`** — exports `<DOMAIN>_DEFS` (the parsed array), `<DOMAIN>_LIBRARY` (id → def record via `Object.fromEntries`), `<DOMAIN>_IDS`, a `FALLBACK_<DOMAIN>` literal (used only if the JSON array is ever empty), `DEFAULT_<DOMAIN>` (`DEFS[0] ?? FALLBACK`), `get<Domain>Def(id)`, and `resolve<Domain>(id?)` (falls back to the default for unknown/stale ids — never throws on a bad reference).
5. **`index.ts`** barrel re-exporting the model type, the library exports, and the schema exports.
6. **`src/app/api/<domain>/route.ts`** — `GET` returns the array; `POST` (404s in `NODE_ENV=production`) parses the body with the Zod schema and upserts by `id` (replace if found, else push); `DELETE` removes by `?id=` query param.

Plus the Game Design UI trio: `<domain>-create-screen.tsx` (form fields + live preview via the face component, `slugify(name)` → `<domain>_<slug>_<ts36>` id generation for new entries), `<domain>-face.tsx` (a shared ~150×196 library-tile component reused by both the grid and the editor's preview rail), `<domain>-library-screen.tsx` (grid of tiles with Edit/Delete `TileAction`s). Wired into `card-library-screen.tsx`'s `SubTab` union + header count/create-button branches, and `fish-mafia-app.tsx`'s `Screen`/`DesignScreen` unions, the session-storage `DesignLocation` (so a Fast-Refresh full reload after a save/delete doesn't drop the user back at the menu mid-edit), and CRUD callbacks that optimistically update React state then `fetch` the API route in the background (`.catch(() => {})` — best-effort, UI already reflects the change).

## When to Use

Any new "thing the Game Design tool authors and gameplay code resolves by id" — e.g. a future Relic or Boss-Phase catalog. Follow the six-piece shape exactly rather than improvising a new persistence style; it keeps drift-guard, fallback, and CRUD conventions consistent across domains.

## When Not to Use

One-off config that isn't authored through the design tool, or data that's never referenced by id from gameplay code (nothing to `resolve*`/fall back on).

## Related

- @wiki/memory/characters-domain-owns-hero-stats-and-starter-deck (first full instance of this shape)
- @wiki/decisions/summon-def-has-no-team-field (a domain-specific deviation this pattern accommodates: omitting a field that other instances of the pattern do carry)
- `src/lib/game/summons/` — second instance (Summon Design subtab + Card Design summon-unit picker)
- `src/lib/game/units/` (`EnemyDef`) and `src/lib/game/characters/` (`CharacterDef`) — the two instances this pattern was generalized from