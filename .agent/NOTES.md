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

## Session: 2026-09-12 (bug fix, events, cards, enemies, trinkets, stages)

### Done
- **Bug fix:** Shallows boss stage (`stage_boss_alpha_mshy1szy`) placed `collection_shark` instead of `boss_thug` — fixed the entry in `stage-database.json` so Barnacle Brute is the correct shallows boss.
- **4 new events:** Floating Black Market, Debt Collector's Trap, Sap-Sipper's Bounty, Forgotten Cache. Pool goes from 4→8 for more overworld encounter variety.
- **3 new cards:** Poison Pill (0-cost 1dmg+-1ATK), Break In (1-cost 1dmg+2coin), Slush Fund (2-cost 3coin+draw1).
- **2 new enemies:** The Informant (shallows/midwaters ranged debuffer with Kneecap cards), The Caster (midwaters/depths ranged glass cannon with Foreclose cards). Both added to zone pools.
- **2 new trinkets:** Seaweed Wrap (common, heal 2 on combat start), Smuggler's Ledger (uncommon, +3 coin on card sell).
- **2 new stages:** The Reef Gate (shallows normal), The Debtor's Row (midwaters normal).
- All 349 tests pass, TypeScript compiles clean.

### Files changed
- `src/lib/game/stages/data/stage-database.json` — bug fix (shallows boss), 2 new stages
- `src/lib/game/overworld-data.ts` — 4 new events, Informant/Caster in zone pools
- `src/lib/game/cards/card-database.json` — 3 new cards
- `src/lib/game/units/data/enemy-database.json` — 2 new enemies
- `src/lib/game/trinkets/data/trinket-database.json` — 2 new trinkets
- `CHANGELOG.md` — session entry
- `.agent/NOTES.md` — this update

### Ideas / TODOs for next session
- Consider adding a debuff/buff visual indicator (e.g. a small icon over debuffed units showing the buffAtk value). Currently buffAtk changes are invisible to players.
- The Caster enemy's high-range Foreclose casts (range 3) mean it can 6-shot the hero from across the board. If it feels oppressive, reduce its deck to Collection Call only or give it fewer Foreclose cards.
- The Informant + Collection Agent pair in shallows makes for a very rangy zone start. Keep an eye on balance.
- The event pool is now 8. Consider adding 2 more (10 total) for true diversity where you rarely see the same event twice in one run.
- Enemy card pools currently draw 1 card per turn per enemy. Consider tuning: drawing 2 cards for ranged/guardian enemies, or allowing enemies to hold cards between turns for more interesting play patterns.
- Tooling suggestion: if AI-generated card art is desired, a stable-diffusion pipeline or similar image gen tool could populate `public/card-art/` with fish character portraits matching the crime-noir aesthetic.
- The Fin economy is now closed at 5 per battle with UPGRADE_PRICE=15. Keep an eye on whether Fin feels too stingy or too generous — `FIN_PER_BATTLE` and `UPGRADE_PRICE` are the two tuning knobs.