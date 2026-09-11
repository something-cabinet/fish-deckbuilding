# AI agent notes (persists across sessions on ai-new-feature)

## Request from dev

- Currently enemy with card-casting ability can use card without player know in advance, which is bad game design. Let player know which card the enemy will cast on its turn.
- Show the card's range on the card UI itself, currently not supported.

## Session: 2026-09-11 (continued — fin economy, content batch, upgrade badge)

### Done

- **Fin economy closed (fix):** Fin now earns 5 per battle win via `FIN_PER_BATTLE` constant. `updateHp` in `use-overworld.ts` changed from overwrite to additive (`s.fin + fin`) so accumulated Fin persists across battles.
- **Always show Fin:** Map HUD and shop upgrade section now always visible even at 0 Fin, so players learn the mechanic exists.
- **Content batch (6 cards, 3 enemies, 3 trinkets, 3 stages):**
  - Cards: Enforce (5-cost 9dmg), Cut (0-cost self-heal 2), Stiff (1-cost draw 1 + coin 1), Torch (3-cost 3dmg AoE cross), Ringer (2-cost summon Goon), Payout (3-cost gain 6 coin).
  - Enemies: Collection Agent (shallows ranged normal), Heavy (tank elite), Mob Nurse (healer elite with heal cards).
  - Trinkets: Blood in the Water (onEnemyKilled: +1 ATK), Hot Tip (onCombatStart: +1 coin + draw 1), Black Ledger (onCardSold: +3 coin).
  - Stages: The Collector's Due (midwaters normal), The Strongroom (depths normal), The Sick Room (depths elite).
  - Zone pool diversity: Added all new enemies to appropriate zone pools.
- **EnemySpawnTemplate range:** Added optional `range` field to `EnemySpawnTemplate` and pass-through in `battleEnemiesForZone` so ranged enemies from zone pools use authored range.
- **Upgrade badge:** Overworld map deck modal now shows teal `+N` badge for upgraded cards.
- All 349 tests pass (44 files), TypeScript compiles clean.

### Files changed

- `src/lib/game/overworld-data.ts` — added `FIN_PER_BATTLE = 5`, zone pool updates
- `src/hooks/use-overworld.ts` — `updateHp` fin additive
- `src/lib/game/overworld-types.ts` — `EnemySpawnTemplate.range`
- `src/lib/game/overworld-engine.ts` — `battleEnemiesForZone` range pass-through
- `src/lib/game/cards/card-database.json` — 6 new cards
- `src/lib/game/units/data/enemy-database.json` — 3 new enemies
- `src/lib/game/trinkets/data/trinket-database.json` — 3 new trinkets
- `src/lib/game/stages/data/stage-database.json` — 3 new stages
- `src/components/game/overworld-map.tsx` — always show Fin, +N badge in deck modal
- `src/components/game/shop-screen.tsx` — show upgrade section even at 0 Fin
- `src/components/game/fish-mafia-app.tsx` — `handleWin` passes `FIN_PER_BATTLE`
- `CHANGELOG.md` — wrote full session entry

### Ideas / TODOs for next session

- Enemy card pools currently only draw 1 card per turn per enemy and discard unused hands after the turn. Consider tuning: drawing 2 cards for ranged/guardian enemies, or allowing enemies to hold cards between turns for more interesting play patterns.
- Consider adding a few more enemy templates with card-focused decks (e.g. a caster enemy with high-damage spells, or a debuffer).
- Tooling suggestion: if AI-generated card art is desired, a stable-diffusion pipeline or similar image gen tool could populate `public/card-art/` with fish character portraits matching the crime-noir aesthetic.
- The Fin economy is now closed at 5 per battle with UPGRADE_PRICE=15. Keep an eye on whether Fin feels too stingy or too generous — `FIN_PER_BATTLE` and `UPGRADE_PRICE` are the two tuning knobs.
- The `game-state.interface.ts` has `fin` but it's just a pass-through from overworld. Consider removing `fin` from GameState if it's never used during battle logic, or use it for in-battle Fin rewards (e.g. killing a tough enemy drops fin mid-fight).
