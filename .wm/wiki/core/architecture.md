---
title: Fish Roguelite Deckbuilding — Architecture
type: core
id: wiki:core:architecture
tags: [core, architecture]
---

# Architecture

## Stack

| Layer | Technology | Role |
|-------|-----------|------|
| Game engine | **Excalibur.js** | Canvas rendering, ECS (planned), EventEmitter |
| UI overlay | **Svelte 5** | Menus, HUD, card hand, shop, map — all DOM |
| Language | **TypeScript** | Strict typing throughout |
| Bundler | **Vite** | Dev server + production builds |
| Testing | **Vitest** | 79 tests, ~500ms |

## Architecture Pattern

```
┌─────────────────────────────────────┐
│  Svelte 5 (UI)                      │
│  - Screens (menu, battle, map, etc) │
│  - HUD (HP, coins, enemies)         │
│  - Battle (hand, grid, defense)     │
│  - Subscribes to game state         │
├─────────────────────────────────────┤
│  Game Logic (pure functions)        │
│  - CombatController / CoinSystem    │
│  - EnemyAI / Keywords / Effects     │
│  - RelicSystem / TurnFlow           │
│  - All tested (79 tests, 0 P0s)    │
├─────────────────────────────────────┤
│  Excalibur.js (canvas)              │
│  - Renders background / VFX         │
│  - Future: ECS Systems + Events     │
│  - Currently: visual backdrop only  │
├─────────────────────────────────────┤
│  State (run/combat split)           │
│  - RunState: persistent across run  │
│  - CombatState: per-battle only     │
│  - run.deck COPIED into battle at   │
│    combat start — never mutated     │
└─────────────────────────────────────┘
```

## State Model

```
GameState
├── screen: 'menu' | 'map' | 'battle' | 'shop' | 'rest' | 'death' | 'victory'
├── run: RunState (persistent across battles)
│   ├── heroHp/maxHp, heroMaxHand, gold, deck[]
│   ├── mapNodes[], currentNodeId, relics[], allies[]
│   ├── seed, act, battleIndex, creditLimit
└── combat: CombatState (per-battle, created on enter)
    ├── battleDeck[] (copy of run.deck), battleDiscard[]
    ├── hand[], sellPile[], coins, creditUsed
    ├── enemies[], enemyActions[], turnPhase, turnNumber
    ├── encounterId, rewardGold, rewardCards, aiStrategy
```

## File Structure

```
src/
├── game/combat/           # ★ Core game logic (79 tests)
│   ├── CombatController.ts  # State machine
│   ├── CoinSystem.ts        # Sell/spend/credit/interest
│   ├── TurnFlow.ts          # Draw, startBattle, phase management
│   ├── EnemyAI.ts           # Per-unit AI (aggressive/balanced/defensive)
│   ├── Keywords.ts          # lifesteal, pierce, double_strike
│   ├── Effects.ts           # damage, heal, draw, gainCoins
│   ├── RelicSystem.ts       # Relic triggers
│   ├── CardTypes.ts         # All type defs
│   └── __tests__/           # 7 test files, 79 tests
├── game/cards/cardData.ts   # 39 card definitions
├── game/enemies/encounterData.ts # 6 encounters
├── game/relics/relicData.ts # 5 relics
├── game/map/mapGenerator.ts # Seeded map generation
├── ui/                      # ★ Svelte 5 components
│   ├── screens/             # MainMenu, RestScreen, DeathScreen, VictoryScreen
│   ├── hud/                 # BattleHUD, MapOverlay, CoinDisplay
│   ├── battle/              # EnemyRow, HandViewer, SellOrderPrompt, DefensePrompt
│   ├── shop/                # ShopPanel
│   └── shared/              # Common components
├── lib/
│   ├── state.ts             # Svelte $state runes
│   └── db.ts                # IndexedDB stub
├── App.svelte               # Screen router + Excalibur mount
└── app.css                  # Ocean debt city palette
```

## Combat Flow

```
PLAYER TURN:
1. Draw to maxHand (4 for Guppy)
2. Start with 0 coins
3. Actions (any order):
   a. SELL card → sellPile → gain coins
   b. PLAY attack → spend coins (can borrow to -5) → click enemy → damage + effects + keywords
4. End turn → order sellPile → cards to bottom of deck
5. If coins < 0 → interest damage = |debt|
6. Coins reset to 0

ENEMY TURN:
1. EnemyAI assigns per-unit actions (attack/defend by strategy)
2. Player blocks: discard hand cards for defense value
3. Unblocked damage hits hero
4. Dead enemies removed → check victory/defeat
5. Next turn
```

## Key Architectural Decisions

| Decision | Status | Doc |
|----------|--------|-----|
| Pure functions → Excalibur ECS | Pending rewrite | @wiki/decisions/pure-function-ecs-pivot |
| FaB coin system with sell ordering | Current | @wiki/decisions/fab-coin-system |
| Grid → StS direct targeting | Completed | (in spec) |
| Run/combat state split | Completed | @wiki/patterns/run-combat-state-split |
| TDD + SDD workflow | Enforced | @wiki/rules/tdd, @wiki/rules/spec-driven-development |

## Full Spec

@wiki/specs/fish-roguelite-deckbuilding
