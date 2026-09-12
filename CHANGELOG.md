# Changelog

## [Unreleased]

### Changed
- **Enemy ranks follow the mafia hierarchy:** the Thug and Enforcer unit kinds are now **Soldier** and **Capo** (Soldier → Capo → Boss). Renamed in `UnitKind`, the enemy card badge, the enemy designer's Kind picker, and the generic enemies' display names (Thug → Soldier, Enforcer → Capo, stage "Double Enforcer" → "Double Capo"). Enum order is unchanged, so saved `kind` values stay valid; enemy ids and sprite file names (`thug`, `enforcer`) are kept so existing stages still resolve.
- **Placeholder sprites as fallbacks:** units without a sprite of their own now fall back to placeholder art instead of real character art — `placeholder-enemy` for Soldier/Capo/Boss, `placeholder-player` for the hero, `placeholder-summon` for goons. The stage editor grid (hero start and enemies without an icon) and new enemies/characters/summons in the designers also start on the placeholders. Names live in `PLACEHOLDER_SPRITE` (`sprites.ts`).

### Added
- **Placeholder sprites:** `public/sprites/placeholder-enemy.png`, `placeholder-player.png`, `placeholder-summon.png` (currently copies of thug/hero/goon, to be replaced with dedicated placeholder art).
- **Demand Letter card art (test):** `public/card-art/demand_letter.png`, generated with the new `gen_asset.py` art tool as a pipeline test. Not yet assigned to the card (no `"art"` field set).

### Fixed
- **Shallows boss stage uses wrong boss:** `stage_boss_alpha` placed `collection_shark` (The Collection Shark, the midwaters boss) instead of `boss_thug` (Barnacle Brute, the shallows boss). This made the first zone's boss harder than intended and showed the wrong boss fish. `battleSetupForNode` uses authored stages with priority, so this affected every shallows boss fight.

### Added
- **4 new overworld events:** Floating Black Market (buy Pipe Bomb with gold or HP), The Debt Collector's Trap (debt/HP risk-reward), The Sap-Sipper's Bounty (fight or sneak past a guardian), The Forgotten Cache (crack a strongbox for Pawn Ticket). Event pool grows from 4 to 8, significantly more run variety in overworld encounters.
- **3 new cards:** Poison Pill (0-cost attack: 1 damage + -1 ATK debuff), Break In (1-cost attack: 1 damage + 2 coin), Slush Fund (2-cost skill: 3 coin + draw 1). Fills gaps in 0-cost debuff, efficient economy attack, and mid-cost economy+cycle.
- **2 new enemies:** The Informant (shallows/midwaters — fast ranged debuffer with Kneecap cards, artillery AI), The Caster (midwaters/depths — slow ranged glass cannon with Foreclose, artillery AI). Both added to appropriate zone battle pools.
- **2 new trinkets:** Seaweed Wrap (common — heal 2 HP at combat start), Smuggler's Ledger (uncommon — +3 coin on card sell).
- **2 new stages:** The Reef Gate (shallows normal — 2 thugs + enforcer), The Debtor's Row (midwaters normal — Loan Officer + 2 mid-thugs).

### Added
- **Fin economy closed:** Fin now earns 5 per battle win (`FIN_PER_BATTLE` constant) and accumulates additively. The map HUD and shop upgrade section always display Fin (even at 0) so players learn the mechanic exists.
- **6 new cards:** Enforce (5-cost 9dmg finisher), Cut (0-cost self-heal 2), Stiff (1-cost draw 1 + gain 1 coin), Torch (3-cost 3dmg AoE cross), Ringer (2-cost summon Goon), Payout (3-cost gain 6 coin).
- **3 new enemies:** Collection Agent (shallows ranged normal), Heavy (midwaters/depths tank), Mob Nurse (midwaters/depths healer with heal cards).
- **3 new trinkets:** Blood in the Water (onEnemyKilled: +1 ATK, uncommon), Hot Tip (onCombatStart: +1 coin + draw 1, common), Black Ledger (onCardSold: +3 coin, rare).
- **3 new stages:** The Collector's Due (midwaters normal w/ Collection Agent), The Strongroom (depths normal w/ Heavy), The Sick Room (depths elite w/ Mob Nurse + Heavy).
- **Zone pool diversity:** Collection Agent added to shallows pool; Heavy and Mob Nurse added to midwaters and depths pools, with difficulty-scaled stats.
- **EnemySpawnTemplate range field:** `EnemySpawnTemplate` now supports an optional `range` field, passed through to `battleEnemiesForZone` so ranged enemies from zone pools correctly use their authored range instead of defaulting to melee.
- **Upgrade badge in deck modal:** Cards in the overworld deck modal now show a teal `+N` badge when they have been upgraded with Fin.
- **Enemy-cast cards:** Enemies now play cards from their authored decks each turn instead of only using basic attacks. Each living enemy draws one card per turn from their pool at phase start. The AI evaluates card casts alongside move+attack using the same utility scorer weights, picking the best option. Cards resolve through the shared effect system, with proper `casterTeam` support for enemy-cast summons. Covers all authored enemy decks (Thugs, Enforcers, Fixers, Loan Officers, bosses).
- Fin upgrade shop (SPEC D11): Fin can now be spent at shop nodes to upgrade cards deck-wide. Each upgrade level bumps damage/heal effect amounts by 1, adds a "+N" name marker, and raises sell value. Cost scales per level (15 + 15 × level), capped at level 5. Accessible from any shop node when `fin > 0`.
- 9 new crime-noir themed cards: Rub-Out (0-cost 1dmg), Bury the Evidence (1-cost 1dmg+cycle), Protection Money (2-cost 2dmg+2coin), Tax Audit (3-cost 4dmg+1coin), Shell Game (0-cost draw 1), The Treatment (1-cost heal 3 ally), Protection Racket (2-cost ally +2 ATK), Mermaid's Call (summon Siren 4-cost).
- Siren summon template (7 HP / 3 ATK), used by Mermaid's Call.
- 5 new trinkets: Oyster Ledger (+2 draws on combat start, uncommon), Razor Gill (+2 ATK, rare), Mob Loyalty Card (5 coin per kill, rare), Swimming Fins (+1 move, common).
- 2 new enemy templates: The Fixer (ranged artillery, aiProfile: artillery), The Loan Officer (guardian, aiProfile: guardian).
- 5 new stages: Witness Protection (shallows elite w/ Fixer), The Twilight Gauntlet (midwaters normal), The Ledger Desk (midwaters elite w/ Loan Officers), The Bottom Line (depths normal).
- 4 new events: The Slippery Pawn (card reward option), The Lost Purse (debt/gold choice), The Fence's Market (trinket reward options).
- Fill/balance: Fixer and Loan Officer added to midwaters/depths zone battle pools so generated (non-stage) battles also feature them.
- **3 new stages:** The Collection Deck (midwaters boss — Collection Shark + 2 Fixers), The Write-Off (depths elite — 2 Loan Officers + Fixer + guards), The Final Ledger (depths boss — The Forecloser + Fixer + Loan Officer + guards). Every zone now has a complete normal/elite/boss stage suite.
- **Puffer (The Enforcer)** — third playable character with 18 HP and a support/defense-oriented starter deck. Built tough for longer fights.
- **4 new cards:** Debt Collector (1-cost 1dmg+1coin), Backup (1-cost ally +1 ATK), Hard Stop (2-cost 3dmg), Inside Job (3-cost gain 5 coin).
- **Upgrade toast feedback:** Shop now shows a temporary "CardName upgraded!" toast with sparkle icon when a Fin upgrade is applied, auto-dismissing after 2 seconds.

### Fixed
- Trinket maxHp bonus (e.g. Shark Tooth +5, Coral Crown +8) now also raises the hero's current HP at battle start, so the extra pool is immediately usable instead of requiring a heal source.
- Cards with no legal target in range (e.g. an attack card when all enemies are dead or out of range) no longer glow gold as playable — they render dim like any unaffordable card.
- Stale hardcoded card-count assertions in card-library-screen test were replaced with data-driven lookups so the test doesn't break when the card pool grows.
- TypeScript compile errors cleaned up in card-library-screen test (CardType enum usage) and duplicate import in overworld-engine spec.
- Summon effect in `resolveCardEffects` now uses the caster's team instead of hardcoding `Team.Player`, enabling enemy-cast summon cards.
- `clone()` in engine helper now deep-copies `enemyCardPools` and `enemyHands` to prevent mutation leaks during enemy phase simulation.