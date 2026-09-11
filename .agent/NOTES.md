# AI agent notes (persists across sessions on ai-new-feature)

## Session: 2026-09-11 (content + enemy-cast cards)

### Done
- **Enemy-cast cards (big feature):** Enemies now play cards from their authored decks. Each living enemy draws one card per turn at enemy phase start, and the AI evaluates card casts alongside move+attack using the same utility scorer weights. Cards resolve through the shared effect system. Fixes the dormant `deck` field in enemy-database.json. See `ai.service.ts:planEnemyTurn` for card-candidate generation, `turn.service.ts:applyEnemyStep` for CastCard handling, `state.service.ts:createInitialState` for pool building.
- **Stage completion (3 stages):** Added midwaters boss (The Collection Deck), depths elite (The Write-Off), depths boss (The Final Ledger). Every zone now has a full normal/elite/boss stage suite.
- **New character + cards:** Puffer (The Enforcer) — 18 HP bruiser with support/defense deck. 4 new cards: Debt Collector, Backup, Hard Stop, Inside Job.
- **Upgrade toast feedback:** Shop shows a 2-second "CardName upgraded!" toast when Fin is spent.
- **Bug fixes:** Summon effect no longer hardcodes Team.Player (uses casterTeam); clone() now deep-copies enemyCardPools/enemyHands.
- All 349 tests pass (44 files), TypeScript compiles clean.

### Files changed
- `src/lib/game/battle/enums/enemy-step-kind.enum.ts` — added `CastCard`
- `src/lib/game/battle/models/enemy-step.interface.ts` — added `cardId`
- `src/lib/game/battle/models/game-state.interface.ts` — added `enemyCardPools`, `enemyHands`
- `src/lib/game/battle/models/ai-candidate.interface.ts` — added `kind`, `cardId`
- `src/lib/game/battle/services/state.service.ts` — build enemy card pools in `createInitialState`
- `src/lib/game/battle/services/turn.service.ts` — `startEnemyPhase` draws cards; `applyEnemyStep` handles CastCard
- `src/lib/game/battle/services/ai.service.ts` — `planEnemyTurn` evaluates card-cast candidates
- `src/lib/game/cards/services/effects.service.ts` — summon uses `casterTeam` instead of hardcoded Player
- `src/lib/game/shared/helpers/engine.helper.ts` — clone deep-copies new fields
- `src/lib/game/units/data/enemy-spawn.interface.ts` — added `deck`, `templateId`
- `src/lib/game/stages/services/stage.service.ts` — pass deck + templateId through stageToSpawns
- `src/lib/game/stages/data/stage-database.json` — 3 new stages (midwaters boss, depths elite/boss)
- `src/lib/game/cards/card-database.json` — 4 new cards
- `src/lib/game/characters/data/character-database.json` — Puffer character
- `src/components/game/shop-screen.tsx` — upgrade toast feedback

### Ideas / TODOs for next session
- Enemy card pools currently only draw 1 card per turn per enemy and discard unused hands after the turn. Consider tuning: drawing 2 cards for ranged/guardian enemies, or allowing enemies to hold cards between turns for more interesting play patterns.
- The `fin` display always shows (even at 0) in both top-bar and overworld-map — this was already done in a prior session.
- Consider adding a few more enemy templates with card-focused decks (e.g. a healer enemy that mainly casts heal/support cards, or a caster enemy with high-damage spells).
- Tooling suggestion: if AI-generated card art is desired, a stable-diffusion pipeline or similar image gen tool could populate `public/card-art/` with fish character portraits matching the crime-noir aesthetic.
- The Fin upgrade shop could show a small "Upgraded!" badge on cards in the deck modal that have been boosted (card-face list in the map screen).