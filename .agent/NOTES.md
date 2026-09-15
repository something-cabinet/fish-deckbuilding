# AI agent notes (persists across sessions on ai-new-feature)

## Dev requests
- A way to thin the deck / remove cards permanently, like most deckbuilding game.
- An Exhaust effect on card: after play, this card temporarily removed from the deck for the current fight (not removed permanently).

## Session: this session (bug fixes, content batch, art generation)

### Done

- **Bug fix — negative heal HP floor (Bug 5):** `heal` effect in `effects.service.ts` clamped only the upper bound (`Math.min(maxHp, ...)`) but not the lower bound. Negative-amount heal cards (Wire Transfer, Tail Job) could drive HP below 0. Added `Math.max(0, ...)` guard.
- **Content batch:** 4 cards (Night Fish, Contract Killer, Cleanup, Number Cruncher), 2 summons (Night Fish, Killer), 2 enemies (The Auditor, The Cleaner), 2 stages (The Audit Floor, The Cleaning Closet), 2 events (The Abandoned Warehouse, The Numbers Game), 2 trinkets (Snaggletooth, Ledger Shredder).
- **Zone pool entries:** Auditor to midwaters, Cleaner to depths.
- **Art generation:** 4 card arts (night_fish_card, contract_killer_card, cleanup_card, number_cruncher_card), 2 enemy sprites (auditor, cleaner), 3 summon sprites (night_fish, killer, vu_sprite — backfill for Vu which previously shared goon icon). 9 total assets generated.
- All 351 tests pass, TypeScript compiles clean.

### Files changed

- `src/lib/game/cards/services/effects.service.ts` — heal lower-bound clamp
- `src/lib/game/summons/data/summon-database.json` — 2 new summons, vu_sprite icon backfill
- `src/lib/game/cards/card-database.json` — 4 new cards with art references
- `src/lib/game/units/data/enemy-database.json` — 2 new enemies
- `src/lib/game/stages/data/stage-database.json` — 2 new stages
- `src/lib/game/trinkets/data/trinket-database.json` — 2 new trinkets
- `src/lib/game/overworld-data.ts` — zone pool entries, 2 new events
- `public/card-art/*.png` — 4 new card arts
- `public/sprites/*.png` — 5 new sprites (auditor, cleaner, night_fish, killer, vu_sprite)
- `CHANGELOG.md` — session entry
- `.agent/NOTES.md` — this update

### Ideas / TODOs for next session

- All summons now have unique icons (Vu backfilled this session). Consider if any enemies share generic icons — check puffer_guard, heavy, bruiser, spotter etc. for potential backfill.
- Event pool is 16 now. Good diversity — revisit if >20.
- Buff/debuff visual indicators on unit tokens (buffAtk value) — still invisible to players.
- Consider showing move range indicator when selecting a unit (player QoL).
- The shield icon on Bodyguard might be wrong — lucide icons may not have "Shield" as a valid icon name. Verify in game.
- Consider adding a `buffMove` effect type so cards like the planned "Get Moving" can give move buffs — would need new effect kind in CardEffect union + handler in effects.service.ts.
- Consider adding deck-thinning (remove cards permanently) and Exhaust mechanics (next session).