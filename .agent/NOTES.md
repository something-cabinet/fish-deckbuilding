# AI agent notes (persists across sessions on ai-new-feature)

## Dev requests (carried forward — still not implemented in card effects)
- **(done) A way to thin the deck / remove cards permanently** — implemented as `removeRandomFromHand` effect; cards Cut Losses, Fence the Goods, Clean Slate use it.
- **(done) An Exhaust effect on card** — implemented as `exhaust` property on CardDef; cards The Big One, Desperate Measures, Clean Slate use it.

## Session: 2 (8 cards, 1 summon, 3 enemies, 3 stages, 2 events, QoL, art)

### Done

- **8 new cards:** Vig (0c coin-hp trade), Juice (2c heal+buff), Shark Bait (0c dmg+cycle), Toll Booth (2c coin+cycle), Broadside (4c AoE1 2dmg), Sweep (5c AoE2 2dmg), Hit (3c 5dmg+debuff), The Sicario (6c summon).
- **1 new summon:** Sicario (6/4/3 berserker), wired into summon-database.json.
- **3 new enemies:** The Arsonist (shallows, range3, Torch x2, artillery), The Fence (midwaters, economy, guardian), The Interrogator (depths, debuff, brawler).
- **3 new stages:** The Arsonist's Row (shallows normal), The Exchange (midwaters normal), The Interrogation Room (depths elite).
- **2 new events:** The Vig Collector, The Hit Contract.
- **Zone pool updates:** All 3 new enemies added to their zone pools.
- **BuffedATK visual indicator:** Gold "+N" / red "-N" badge on unit token when buffAtk != 0.
- **Exhaust pile in bottom bar:** Flame-icon pile visible when exhaust count > 0.
- **Art generation:** 7 assets (sicario summon sprite, arsonist/fence/interrogator enemy sprites, broadside/sweep/hit card arts). Cap used today: 7/10.
- All 351 tests pass.

### Files changed

- `src/lib/game/summons/data/summon-database.json` — Sicario summon added
- `src/lib/game/units/data/enemy-database.json` — 3 new enemies
- `src/lib/game/cards/card-database.json` — 8 new cards, art wired for broadside/sweep/hit
- `src/lib/game/stages/data/stage-database.json` — 3 new stages
- `src/lib/game/overworld-data.ts` — zone pool updates + 2 new events
- `src/components/game/unit-token.tsx` — buffedATK visual indicator
- `src/components/game/fish-mafia-game.tsx` — exhaust pile indicator
- `public/sprites/sicario.png` — summon sprite
- `public/sprites/arsonist.png` — enemy sprite
- `public/sprites/fence.png` — enemy sprite
- `public/sprites/interrogator.png` — enemy sprite
- `public/card-art/broadside.png` — card art
- `public/card-art/sweep.png` — card art
- `public/card-art/hit.png` — card art
- `CHANGELOG.md` — updated
- `.agent/NOTES.md` — this update

### Ideas / TODOs for next session

- **buffMove effect:** planned `buffMove` effect type for future "Get Moving" card — would need new CardEffect kind + handler + schema update.
- **buffHp effect / temp HP:** not yet implemented but could open design space.
- **Move range indicator:** showing reachable tiles when selecting a unit would be a nice QoL improvement (currently only shown when you click and drag).
- **South shallows / north midwaters gap:** Now partly filled (Arsonist in shallows, Fence in midwaters). Ridge Runner and Puffer Guard could use more stages built around them.
- **Consider adding remove-from-deck (non-random) effect** — a card that lets you choose which card to remove. More powerful but requires a targeting modal in the UI.
- **Content left on placeholder art:** The Sicario card art, Vig, Juice, Shark Bait, Toll Booth — these don't have `art` field and use generic fallbacks. Backfill next session.
- **The Arsonist has Torch (3c AoE card) in its deck** — verify enemy-cast AoE works correctly in playtesting.
- **Consider making Sweep cost 4 instead of 5** — 5 cost may be too expensive for 2dmg AoE2; playtest.
- **The Sicario at 6 cost is the most expensive card in the game** — verify it's worth the investment in playtesting.