# Deepwork: Fish Roguelite Deckbuilding Game — Complete

## Current State (July 27, 2026)

### Tech
Excalibur.js (canvas backdrop) + Svelte 5 + Vite + TypeScript

### Game
Guppy the Debtor — debt/finance themed roguelite deckbuilder.

### Combat System (Final Design)
- **StS-style**: No grid, direct targeting. Click enemy to attack.
- **FaB coins**: Sell cards for coins (FaB reset each turn). Credit limit: -5. Interest damage if in debt at end of turn.
- **3-purpose cards**: SELL (coins) / PLAY (attack) / BLOCK (defense on enemy turn)
- **Sell ordering**: Sold cards go to sellPile. At end of turn, player orders them → bottom of deck.

### Project Rules
- TDD: Red-Green-Refactor for all implementation (AGENTS.md + memory)
- Svelte UI components excluded from tests (they call tested pure functions)

### File Structure
```
src/
  game/combat/        CombatController, CoinSystem, TurnFlow, CardTypes (40 tests)
  game/cards/         Card definitions (18 cards)
  game/enemies/       Encounter definitions (6 encounters)
  game/relics/        Relic definitions (5 stubs)
  game/map/           Seeded map generation
  ui/                 Svelte 5 screens, HUD, battle components
  lib/                Svelte $state runes (run/combat split), IndexedDB stub
  App.svelte          Screen router + Excalibur mount
```

### Built
- ✅ Project scaffold, color palette, 8 UI screens
- ✅ StS combat with direct targeting
- ✅ FaB coin system (sell for coins, reset each turn, credit limit -5, interest damage)
- ✅ Sell pile ordering prompt (reorder sold cards at end of turn)
- ✅ Defend by discarding cards from hand
- ✅ 6 encounters (easy→boss)
- ✅ Procedural map with branching paths, shop, rest
- ✅ Card rewards after victory
- ✅ Victory/death flow
- ✅ 40 tests passing

### Remaining
- 3b: Enemy AI (per-unit strategies reading aiStrategy tag)
- 3c: Effects engine, keywords, relics, card expansion to ~40
- IndexedDB persistence (Phase 4)
- Art/polish (Phase 5)
