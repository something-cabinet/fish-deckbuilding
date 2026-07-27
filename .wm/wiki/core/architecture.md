---
title: Fish Roguelite Deckbuilding — Architecture
type: core
tags: [core, architecture]
---

---
title: Fish Roguelite Deckbuilding — Architecture
type: core
tags: [core, architecture]
---

# Architecture

## Stack

| Layer | Technology | Role |
|-------|-----------|------|
| Game engine | **Excalibur.js** | Canvas rendering, ECS entities + components, EventEmitter |
| Game orchestration | **CombatOrchestrator** | Turn-based flow coordinator, owns ECS entities, calls pure functions |
| Event layer | **EventBus (typed)** | Excalibur EventEmitter with typed CombatEvents interface |
| Bridge | **Bridge** | Syncs Excalibur events → Svelte $state reactively |
| UI overlay | **Svelte 5** | Zone architecture, reads from $state, dispatches via bridge |
| Language | **TypeScript** | Strict typing throughout |
| Bundler | **Vite** | Dev server + production builds |
| Testing | **Vitest** | 92 tests, ~1s |

## Architecture Pattern

```
┌──────────────────────────────────────────┐
│  Svelte 5 (UI) — zone architecture       │
│  - BattleHUD: CSS Grid layout coordinator│
│  - 9 zone components (self-contained)    │
│  - ModalHost for overlays                │
│  - Reads from $state (synced via bridge) │
│  - Dispatches actions via bridge         │
├──────────────────────────────────────────┤
│  Bridge Layer (event → $state sync)      │
│  - Subscribes to eventBus                │
│  - state:changed snapshot (primary sync) │
│  - Exposes getCurrentOrchestrator()      │
│  - createAndRegisterOrchestrator()       │
├──────────────────────────────────────────┤
│  EventBus (typed Excalibur EventEmitter) │
│  - state:changed (full snapshot)         │
│  - combat:defensePhase (enemy actions)   │
│  - interest:due / combat:victory/defeat  │
│  - shop/rest events (informational)      │
├──────────────────────────────────────────┤
│  CombatOrchestrator (turn-based ECS)     │
│  - Owns Hero + Enemy ECS entities        │
│  - Components: Health, Coin, Turn, Deck  │
│  - Uses pure functions for domain logic  │
│  - Emits state:changed after each action │
│  - battleOver guard (idempotent checks)  │
├──────────────────────────────────────────┤
│  Pure Functions (tested, 79 tests)       │
│  - CoinSystem / Keywords / Effects       │
│  - EnemyAI / TurnFlow / RelicSystem      │
│  - No side effects, state-in/state-out   │
├──────────────────────────────────────────┤
│  Excalibur.js (canvas)                   │
│  - Renders background, scene management  │
│  - Actors for hero/enemy entities        │
│  - Future: visual effects, animations    │
├──────────────────────────────────────────┤
│  State (run/combat split)                │
│  - Svelte $state synced from bridge      │
│  - RunState: persistent across run       │
│  - CombatState: per-battle only          │
│  - run.deck COPIED into battle deck      │
└──────────────────────────────────────────┘
```

## State Model

```
GameState
├── screen: 'menu' | 'map' | 'battle' | 'shop' | 'rest' | 'death' | 'victory'
├── run: RunState (persistent across battles)
│   ├── heroHp/maxHp, heroMaxHand, gold, deck[]
│   ├── mapNodes[], currentNodeId, relics[], allies[]
│   ├── seed, act, battleIndex, creditLimit
└── combat: CombatState (per-battle, synced via bridge)
    ├── battleDeck[] (copy of run.deck), battleDiscard[]
    ├── hand[], sellPile[], coins, creditUsed
    ├── enemies[], enemyActions[], turnPhase, turnNumber
    ├── encounterId, rewardGold, rewardCards, aiStrategy
    ├── interestDue, incomingDamage
```

## File Structure

```
src/
├── game/combat/           # ★ Core pure function game logic (79 tests)
│   ├── CoinSystem.ts        # Sell/spend/credit/interest
│   ├── TurnFlow.ts          # Draw, startBattle, phase management
│   ├── EnemyAI.ts           # Per-unit AI (aggressive/balanced/defensive)
│   ├── Keywords.ts          # lifesteal, pierce, double_strike
│   ├── Effects.ts           # damage, heal, draw, gainCoins
│   ├── RelicSystem.ts       # Relic triggers
│   ├── CardTypes.ts         # All type defs
│   ├── CombatController.ts  # @deprecated — replaced by CombatOrchestrator
│   └── __tests__/           # 7 test files, 79 tests
├── game/systems/           # ★ ECS orchestration (13 integration tests)
│   ├── CombatOrchestrator.ts # Turn-based ECS orchestrator
│   ├── index.ts
│   └── __tests__/
│       └── CombatOrchestrator.test.ts  # 13 integration tests
├── game/components/
│   └── index.ts             # 10 Excalibur Component classes
├── game/events.ts           # Typed EventBus (CombatEvents interface)
├── game/entities.ts         # Entity factories (hero, enemies, run)
├── game/bridge.ts           # Event → $state bridge layer
├── game/engine.ts           # Excalibur engine setup
├── game/scenes/             # MenuScene, MapScene, BattleScene
├── game/cards/cardData.ts   # 39 card definitions
├── game/enemies/encounterData.ts # 6 encounters
├── game/relics/relicData.ts # 5 relics
├── game/map/mapGenerator.ts # Seeded map generation
├── ui/                      # ★ Svelte 5 components (zone architecture)
│   ├── screens/             # MainMenu, RestScreen, DeathScreen, VictoryScreen
│   ├── hud/
│   │   ├── BattleHUD.svelte  # CSS Grid layout coordinator (190 lines)
│   │   ├── MapOverlay.svelte # Map screen
│   │   └── ModalHost.svelte  # Modal overlay renderer
│   ├── battle/
│   │   ├── zones/            # ★ Self-contained zone components
│   │   │   ├── hero-hp/HeroHPZone.svelte
│   │   │   ├── turn-info/TurnInfoZone.svelte
│   │   │   ├── enemy-hp-bar/EnemyHPBarZone.svelte
│   │   │   ├── coin/CoinZone.svelte
│   │   │   ├── enemy-row/EnemyRowZone.svelte
│   │   │   ├── deck/DeckZone.svelte
│   │   │   ├── hand/HandZone.svelte
│   │   │   ├── action-bar/ActionBarZone.svelte
│   │   │   └── interest-flash/InterestFlashZone.svelte
│   │   ├── EnemyRow.svelte, HandViewer.svelte, etc. (shared components)
│   │   ├── DefensePrompt.svelte, SellOrderPrompt.svelte (overlay modals)
│   │   └── CardReward.svelte, CardTooltip.svelte, DeckViewer.svelte
│   ├── shop/                # ShopPanel.svelte
│   └── shared/              # Common components
├── lib/
│   ├── state.svelte.ts      # Svelte $state runes (synced via bridge)
│   └── db.ts                # IndexedDB stub
├── App.svelte               # Screen router + bridge init + Excalibur mount
└── app.css                  # Ocean debt city palette
```

## Combat Flow

```
PLAYER TURN:
1. Orchestrator.startPlayerTurn() — draw hand, reset coins, apply interest
2. Actions (any order):
   a. SELL card → orchestrator.sellCard() → emit snapshot
   b. PLAY attack → orchestrator.playCard() → spend coins, damage enemy, check battle end → emit snapshot
3. End turn → orchestrator.endPlayerTurn()
   a. If sellPile has cards → sellOrder phase → confirmSellOrder()
   b. Compute enemy AI → defense phase → emit combat:defensePhase
4. Player blocks → orchestrator.defend() → bridge advances to next turn

ENEMY TURN:
1. EnemyAI assigns per-unit actions (attack/defend by strategy)
2. Player blocks: discard hand cards for defense value
3. Unblocked damage hits hero
4. Dead enemies → orchestrator.checkBattleEnd() emits victory/defeat
5. Next turn: orchestrator.startPlayerTurn()
```

## Key Architectural Decisions

| Decision | Status | Doc |
|----------|--------|-----|
| Pure functions + ECS orchestration (dual layer) | Completed | @wiki/decisions/pure-function-ecs-pivot |
| Snapshot-based state sync | Completed | @wiki/patterns/snapshot-state-sync |
| CombatOrchestrator for turn-based ECS | Completed | @wiki/patterns/turn-based-ecs-orchestrator |
| Zone-based UI decomposition | Completed | @wiki/patterns/zone-based-ui-decomposition |
| FaB coin system with sell ordering | Current | @wiki/decisions/fab-coin-system |
| Grid → StS direct targeting | Completed | (in spec) |
| Run/combat state split | Completed | @wiki/patterns/run-combat-state-split |
| TDD + SDD workflow | Enforced | @wiki/rules/tdd, @wiki/rules/spec-driven-development |

## Full Spec

@wiki/specs/fish-roguelite-deckbuilding
