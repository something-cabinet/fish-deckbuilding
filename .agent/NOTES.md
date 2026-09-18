# AI agent notes (persists across sessions on ai-new-feature)

## Dev requests (carried forward — still not implemented in card effects)
- **(done) A way to thin the deck / remove cards permanently** — implemented as `removeRandomFromHand` effect; cards Cut Losses, Fence the Goods, Clean Slate use it.
- **(done) An Exhaust effect on card** — implemented as `exhaust` property on CardDef; cards The Big One, Desperate Measures, Clean Slate use it.

## Session: 3 (bug fixes, buffMove effect, 4 cards, 4 stages, 9 art assets)

### Done

- **3 bugs fixed:**
  - Enemy-cast AoE cards (Torch, Torpedo, Pipe Bomb, Broadside, Sweep) now properly damage all units in blast radius instead of just the primary target. Root cause: `applyEnemyStep` bypassed `unitsInAoe()`.
  - `threatFor` in overworld-engine no longer returns 0 for boss nodes — now returns 4.
  - `affectsTeam` / `unitsInAoe` now accept optional `casterTeam` parameter to filter teams from the correct perspective, preventing latent bug when enemy-cast AoE uses the helper.
- **New effect: buffMove** — added to `CardEffect` union, `effects.service.ts`, `schema.helper.ts`, `Unit` interface, `EffectRow`/`EffectEditor`. Pathfinding (`reachableTiles`, `reachableWithPaths`, `threatAt`) uses `move + buffMove`. Buff resets each turn.
- **4 new cards:** Get Moving (0c, buffMove+1, draw 1), Grease the Wheels (1c ally, buffMove+1), Favor (1c ally, heal 3 + buffMove+1), Stakeout (2c attack, 3 dmg + draw 1).
- **4 new stages:** Puffer Alley (shallows normal), The Scriptorium (midwaters elite), The Clean Room (depths normal), The Pillory (depths elite).
- **9 art assets generated:**
  - New card art: get_moving, grease_wheels, favor, stakeout
  - Backfill: vig, juice, shark_bait, toll_booth, the_sicario
  - All cards now have unique art — no generic fallbacks remain.

### Files changed

- `src/lib/game/battle/services/turn.service.ts` — Bug 1 fix: AoE for enemy-cast cards
- `src/lib/game/cards/services/targeting.service.ts` — Bug 3 fix: casterTeam param
- `src/lib/game/overworld-engine.ts` — Bug 2 fix: boss threat = 4
- `src/lib/game/cards/models/card-effect.model.ts` — buffMove kind
- `src/lib/game/cards/services/effects.service.ts` — buffMove handler
- `src/lib/game/cards/data/schema.helper.ts` — buffMove Zod schema
- `src/lib/game/units/models/unit.interface.ts` — buffMove field
- `src/lib/game/units/data/hero-def.ts` — buffMove: 0
- `src/lib/game/battle/services/state.service.ts` — buffMove: 0 on enemies
- `src/lib/game/battle/services/board.service.ts` — pathfinding uses buffMove
- `src/lib/game/battle/services/ai.service.ts` — AI pathfinding + threatAt uses buffMove
- `src/lib/game/battle/services/ai.service.spec.ts` — buffMove: 0 in test helper
- `src/lib/game/cards/card-database.json` — 4 new cards + 9 art fields
- `src/lib/game/stages/data/stage-database.json` — 4 new stages
- `src/components/game/effect-editor.tsx` — buffMove in EffectRow
- `src/components/game/card-create-screen.tsx` — buffMove in converters
- `public/card-art/get_moving.png`
- `public/card-art/grease_wheels.png`
- `public/card-art/favor.png`
- `public/card-art/stakeout.png`
- `public/card-art/vig.png`
- `public/card-art/juice.png`
- `public/card-art/shark_bait.png`
- `public/card-art/toll_booth.png`
- `public/card-art/the_sicario.png`
- `CHANGELOG.md` — updated
- `.agent/NOTES.md` — this update

### Ideas / TODOs for next session

- **No content left on placeholder art** — all cards now have unique art. Enemies still on placeholder sprites: check enemy-database.json for any without `icon` field.
- **Consider adding remove-from-deck (non-random) effect** — a card that lets you choose which card to remove. More powerful but requires a targeting modal in the UI.
- **buffHp effect / temp HP** — not yet implemented but could open design space (cards that grant temporary HP or over-heal shields).
- **Move range indicator on unit selection** — would be a nice QoL improvement to show reachable tiles when selecting a unit (currently only shown on click and drag).
- **Sweep still costs 5** — playtest to see if 4 is better.
- **The Sicario at 6 cost** — verify it's worth the investment in playtesting.
- **The Scriptorium stage features Caster + Debt Scripter** — both use artillery AI with card casting; verify AI handles two ranged casters well.
- **Tooling suggestion:** enemy-database.json has many enemies without `icon` field — they share the generic placeholder sprite. A future session could generate unique enemy sprites for the ones still on placeholder art.