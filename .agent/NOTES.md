# AI agent notes (persists across sessions on ai-new-feature)

## Session: 2026-09-10 (continued — feature + content batch)

### Done
- **Bug fixes (3):**
  - Trinket maxHp bonus now also increases hero's current HP (Shark Tooth, Coral Crown) so the extra pool is immediately usable.
  - Cards with no legal target no longer glow gold as playable (checks `cardTargets` validity alongside phase+cost).
  - Stale card-library test count assertions made data-driven (was failing after content additions).
- **Fin upgrade shop (big feature, SPEC D11):** Fin can now be spent at shop nodes to upgrade cards deck-wide. See `upgrade.service.ts` for the effect bumping, `overworld-engine.ts` for the spending logic, and `shop-screen.tsx` for the UI. 9 new engine + service tests.
- **Content batch (9 cards, 5 trinkets, 2 enemies, 5 stages, 4 events, 1 summon):** Fills gaps: cheap cycle, ally buff, budget heals, ranged enemies, guardian archetype, midwaters/depths stages, card/trinket events.
- Added new enemies to zone battle pools in `overworld-data.ts`.
- All 349 tests pass (44 files), TypeScript compiles clean.

### Files changed
- `src/lib/game/overworld-types.ts` — added `upgrades: Record<string, number>`
- `src/lib/game/overworld-engine.ts` — `upgradeCard`, `upgradeableCards`, `upgradeCost`; `createNewRun`/`loadSave` backfill
- `src/lib/game/overworld-data.ts` — added `UPGRADE_PRICE = 15` constant
- `src/lib/game/cards/services/upgrade.service.ts` + `.spec.ts` — `applyCardUpgrade` effect bummer
- `src/lib/game/cards/services/index.ts` — added upgrade export
- `src/lib/game/battle/services/state.service.ts` — `createInitialState` applies upgrades to deck cards
- `src/lib/game/cards/card-database.json` — 9 new cards
- `src/lib/game/trinkets/data/trinket-database.json` — 5 new trinkets
- `src/lib/game/units/data/enemy-database.json` — 2 new enemies
- `src/lib/game/stages/data/stage-database.json` — 5 new stages
- `src/lib/game/summons/data/summon-database.json` — 1 new summon (Siren)
- `src/lib/game/overworld-data.ts` — 4 new events, zone pool diversity
- `src/components/game/shop-screen.tsx` — Fin upgrade section
- `src/components/game/fish-mafia-game.tsx` — card playability now checks valid targets
- `src/components/game/fish-mafia-app.tsx` — wired upgrade props to ShopScreen
- `src/hooks/use-overworld.ts` — `upgradeCard` callback, derived upgrade data, wired to `buildBattleState`
- `src/components/game/card-library-screen.render.spec.tsx` — fixed stale assertions
- `src/lib/game/__tests__/overworld-engine.spec.ts` — upgrade engine tests
- `CHANGELOG.md` — wrote full session entry

### Ideas / TODOs for next session
- The Fin upgrade shop has no UI feedback that upgrades *applied* — a toast or log entry when the Fin is spent would make the interaction feel more responsive.
- `top-bar.tsx` already shows Fin during battle (was done in prior session). The upgrade shop overlay is the intended sink. Consider adding a small "Upgraded!" badge on cards in the deck modal that have been boosted.
- The `fin` display in `overworld-map.tsx` still hides at 0. Consider always showing Fin with "0" on new runs so players learn the mechanic exists.
- If Fin becomes too easy to earn (5 per battle = 5 per node = too much) or too stingy, tuning `UPGRADE_PRICE` is the single knob to turn.
- A future session could add enemy-cast cards (the enemy `deck` field in enemy-database.json is authored but currently dormant — enemies only use basic attacks).