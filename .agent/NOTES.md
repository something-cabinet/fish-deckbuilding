# AI agent notes (persists across sessions on ai-new-feature)

## Dev requests
- A way to thin the deck / remove cards permanently, like most deckbuilding game.
- An Exhaust effect on card: after play, this card temporarily removed from the deck for the current fight (not removed permanently).

## Session: this session (bug fixes, content batch, art generation)

### Done

- **Bug fix — self-heal caster target always resolved to hero (Latent Bug 2):** `casterOrEmpty()` in `effects.service.ts` now accepts a `from` position and looks up the actual unit there, so enemy-cast self-heal cards heal the correct caster. Verified by The Debt Scripter enemy (uses Cut cards).
- **Bug fix — buffAtk lower-bound clamp (Bug 3):** `buffAtk` effect handler now clamps to `Math.max(-target.atk, ...)` preventing negative buffAtk from propagating into the raw property.
- **Bug fix — summoned units lack aiProfile (Bug 4):** Added optional `aiProfile` to `SummonDef` interface, Zod schema, database entries, and wired it into summoned Unit creation. Siren (berserker), Decoy (skirmisher), Transport (guardian), Guard (guardian), Vu (berserker) all have sensible archetypes. Goon keeps default brawler.
- **Content batch:** 6 cards (Pump Up, Backhander, The Ledger, Wire Transfer, Tail Job, Bodyguard), 1 summon (Guard), 2 enemies (Debt Scripter, Ridge Runner), 2 stages (The Burning Ledger, The Script Room), 2 trinkets (Gilded Hook, Blood Ink), 1 event (The Ghost Ledger).
- **Zone pool entries:** Ridge Runner to shallows, Debt Scripter to midwaters.
- **Art generation:** 6 card arts (pump_up, backhander, the_ledger, wire_transfer, tail_job, bodyguard), 2 enemy sprites (debt_scripter, ridge_runner), 2 summon sprites (guard_sprite, siren_sprite — backfill for Siren which previously shared Goon icon). 10 total assets generated.
- All 351 tests pass, TypeScript compiles clean.

### Files changed

- `src/lib/game/cards/services/effects.service.ts` — casterOrEmpty fix, buffAtk lower-bound clamp, summon aiProfile wiring
- `src/lib/game/summons/summon-def.model.ts` — added aiProfile field
- `src/lib/game/summons/data/summon-schema.helper.ts` — added aiProfile to Zod schema
- `src/lib/game/summons/data/summon-database.json` — aiProfile on 5 summons, guard added, siren icon backfilled
- `src/lib/game/cards/card-database.json` — 6 new cards with art references
- `src/lib/game/units/data/enemy-database.json` — 2 new enemies with generated icons
- `src/lib/game/stages/data/stage-database.json` — 2 new stages
- `src/lib/game/trinkets/data/trinket-database.json` — 2 new trinkets
- `src/lib/game/overworld-data.ts` — zone pool entries, new event
- `public/card-art/*.png` — 6 new card arts
- `public/sprites/*.png` — 4 new sprites (debt_scripter, ridge_runner, guard_sprite, siren_sprite)
- `CHANGELOG.md` — session entry
- `.agent/NOTES.md` — this update

### Ideas / TODOs for next session

- Vu still uses "goon" placeholder icon — generate `vu_sprite` when cap resets.
- The Spotter range 4 — consider reducing to range 3 or lower move. Still noted.
- Event pool is 14 now. Consider if any events feel samey or if the pool is diverse enough.
- Buff/debuff visual indicators on unit tokens (buffAtk value) — still invisible to players.
- Consider showing move range indicator when selecting a unit (player QoL).
- The shield icon on Bodyguard might be wrong — lucide icons may not have "Shield" as a valid icon name. Verify in game.
- Consider adding a `buffMove` effect type so cards like the planned "Get Moving" can give move buffs — would need new effect kind in CardEffect union + handler in effects.service.ts.
