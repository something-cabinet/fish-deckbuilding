# AI agent notes (persists across sessions on ai-new-feature)

## Dev requests (carried forward — still not implemented in card effects)
- **(done) A way to thin the deck / remove cards permanently** — implemented as `removeRandomFromHand` effect; cards Cut Losses, Fence the Goods, Clean Slate use it.
- **(done) An Exhaust effect on card** — implemented as `exhaust` property on CardDef; cards The Big One, Desperate Measures, Clean Slate use it.

## Session: this session (exhaust, deck-thin, 6 cards, bomber, stages, events, art)

### Done

- **Exhaust mechanic:** New `exhaust?: boolean` field on CardDef. After play, exhausted cards go to `state.exhaust` pile instead of discard. Single-use per fight. Wired through model, schema, actions.service, state.service, clone.
- **Remove (deck-thin) mechanic:** New `removeRandomFromHand` effect in CardEffect union. Removes a random card from player's hand after the played card leaves hand. Wired through model, schema, effects.service.
- **6 new cards:** The Big One (3c 6dmg exhaust), Desperate Measures (0c draw 3 exhaust), Cut Losses (0c remove+2coin), Fence the Goods (1c remove+draw2), Torpedo (2c AoE1 2dmg), Clean Slate (1c remove+1coin exhaust).
- **1 new enemy:** The Bomber (shallows, range 2, Pipe Bomb x2, artillery). Added to shallows zone pool.
- **3 new stages:** The Bomb Bay (shallows normal), The Torpedo Range (shallows normal), The Bruiser Pit (midwaters elite).
- **2 new events:** The Arms Dealer (Big One / Torpedo), The Cleaner's Offer (Cut Losses / Clean Slate).
- **Art generation:** 6 card arts + 1 enemy sprite (7 assets total). 3 of 10 budget remaining unused.
- All 351 tests pass, TypeScript compiles clean.

### Files changed

- `src/lib/game/cards/models/card-def.interface.ts` — exhaust field added
- `src/lib/game/cards/models/card-effect.model.ts` — removeRandomFromHand effect added
- `src/lib/game/cards/data/schema.helper.ts` — schema updated for exhaust + remove
- `src/lib/game/battle/models/game-state.interface.ts` — exhaust pile added
- `src/lib/game/battle/services/state.service.ts` — exhaust array initialized
- `src/lib/game/shared/helpers/engine.helper.ts` — exhaust deep-copied in clone
- `src/lib/game/actions/actions.service.ts` — castCard routes exhaust to exhaust pile
- `src/lib/game/cards/services/effects.service.ts` — removeRandomFromHand handler
- `src/components/game/card-create-screen.tsx` — fromCardEffects handles new effect kind
- `src/lib/game/cards/card-database.json` — 6 new cards
- `src/lib/game/units/data/enemy-database.json` — The Bomber
- `src/lib/game/stages/data/stage-database.json` — 3 new stages
- `src/lib/game/overworld-data.ts` — Bomber in shallows pool, 2 new events
- `public/card-art/*.png` — 6 new card arts
- `public/sprites/bomber.png` — 1 new enemy sprite
- `CHANGELOG.md` — updated
- `.agent/NOTES.md` — this update

### Ideas / TODOs for next session

- **BuffedATK visual indicator:** the ATK plate shows `unit.atk + unit.buffAtk` but there's no visual cue that some of that ATK is from a buff. Consider a gold "+N" badge next to the ATK number to differentiate buffed from base.
- **Move range indicator:** showing reachable tiles when selecting a unit would be a nice QoL improvement (currently only shown when you click and drag).
- **buffMove effect:** planned `buffMove` effect type for future "Get Moving" card — would need new CardEffect kind + handler + schema update.
- **buffHp effect / temp HP:** not yet implemented but could open design space.
- **Exhaust pile in UI:** The exhaust pile exists in state but has no visual representation on the board (no pile shown). Could add a small exhausted-pile stack next to Discard for player awareness.
- **South shallows / north midwaters gap:** Fewer shallows stages with newer enemies would round out variety. Consider more puffer_guard / bomber / ridge_runner stages.
- **Consider adding remove-from-deck (non-random) effect** — a card that lets you choose which card to remove. More powerful but requires a targeting modal in the UI.
- **Check if bodyguard icon 'Shield' is valid in lucide:** Verified — `Shield` is imported from lucide-react in card-icons.ts. Not a bug.