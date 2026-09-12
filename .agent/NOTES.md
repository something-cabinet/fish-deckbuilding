# AI agent notes (persists across sessions on ai-new-feature)

## Request from dev

- Currently enemy with card-casting ability can use card without player know in advance, which is bad game design. Let player know which card the enemy will cast on its turn. **(DONE — card preview overlay before CastCard steps)**
- Show the card's range on the card UI itself, currently not supported. **(DONE — GameCard now shows target label, range crosshair, and AOE radius in description area)**

## Session: this session (enemy card preview, range UI, enemy draw tuning, content batch, art generation)

### Done

- **Enemy card preview (dev request #1):** Added `previewCard` state to `use-fish-mafia.ts`. Before each CastCard step in the enemy turn, show a `CardFace` overlay for 700ms so the player sees what card the enemy will cast. Uses `CARD_LIBRARY` to look up the card def by `cardId` from the step.
- **Card range on hand UI (dev request #2):** `GameCard` component (`card.tsx`) now shows target label (e.g. "Enemy"), cast range (crosshair icon + number), and blast radius (radius icon + tile count) in the description area, matching `CardFace`'s footer.
- **Enemy draw tuning:** `startEnemyPhase` now draws 2 cards for enemies with `range > 1` or `guardian` archetype, 1 for melee enemies. Imported `AiArchetype` from units.
- **Content batch:** 3 cards (Dip 0c +1coin, Hardball 4c 7dmg, Guinea_Pig 1c summon Decoy), 2 enemies (Bruiser — mid/depths tank, Spotter — depths glass cannon range 4), 2 stages (The Pumphouse — shallows elite, The Crosshairs — depths normal), 1 trinket (Barnacle Armor common +2maxHP), 2 events (Underworld Auction, Anonymous Tip), 1 summon (Decoy 2/1/1).
- **Art generation:** 9 card arts (dip, hardball, guinea_pig, foreclose_card, collection_call, pipe_bomb_card, muscle_card, loan_shark_card, cash_flow_card), 7 enemy sprites (bruiser, spotter, caster_sprite, collection_agent, informant, heavy, mob_nurse), 1 summon sprite (decoy). 17 total assets generated.
- All 351 tests pass, TypeScript compiles clean.

### Files changed

- `src/hooks/use-fish-mafia.ts` — previewCard state, CARD_LIBRARY import, endTurn card preview delay before CastCard
- `src/components/game/card.tsx` — range/target/AOE footer in GameCard
- `src/components/game/fish-mafia-game.tsx` — CardPreview overlay, previewCard prop
- `src/lib/game/battle/services/turn.service.ts` — startEnemyPhase draws 2 cards for ranged/guardian
- `src/lib/game/cards/card-database.json` — 3 new cards (dip, hardball, guinea_pig), art fields for 6 existing cards
- `src/lib/game/units/data/enemy-database.json` — 2 new enemies (bruiser, spotter), icon fields for 7 enemies
- `src/lib/game/stages/data/stage-database.json` — 2 new stages (pumphouse, crosshairs)
- `src/lib/game/trinkets/data/trinket-database.json` — 1 new trinket (barnacle_armor)
- `src/lib/game/overworld-data.ts` — 2 new events, zone pool additions
- `src/lib/game/summons/data/summon-database.json` — 1 new summon (decoy)
- `public/card-art/*.png` — 9 new card arts
- `public/sprites/*.png` — 8 new sprites
- `CHANGELOG.md` — session entry
- `.agent/NOTES.md` — this update

### Ideas / TODOs for next session

- The enemy card preview overlay is simple — consider enhancing it: show the enemy token next to the card preview so the player knows *which* enemy is casting.
- The game still has ~22 cards on default/fallback art (no "art" field). Consider generating art for: kneecap, market_rate, hush_money, shakedown, rub_out, bury_evidence, protection_money, tax_audit, shell_game, the_treatment, protection_racket, mermaids_call, debt_collector, backup, hard_stop, inside_job, enforce, cut, stiff, torch, ringer, payout, poison_pill, break_in, slush_fund.
- Some enemies still share generic icons (Soldier variants use "thug", midwaters variant of thug uses "thug", depths thug). Generate individual sprites for each variant.
- The Spotter range 4 makes it very hard to reach. Consider reducing to range 3 or giving it a lower-move stat.
- Event pool is now 12. Consider if any events feel samey or if the pool is diverse enough.
- Consider showing buff/debuff visual indicators on unit tokens (buffAtk value). Currently invisible to players.
- The enemy preview overlay uses `animate-fm-fade-in` — make sure it's defined in globals.css (was there from previous session).