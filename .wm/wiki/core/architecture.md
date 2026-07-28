---
title: Fish Roguelite Deckbuilding — Architecture
type: core
tags: [core, architecture]
---

## Stack

| Layer | Technology | Role |
|-------|-----------|------|
| Game engine | **Excalibur.js** | Canvas rendering, ECS entities + components, EventEmitter, scene management |
| Game orchestration | **CombatOrchestrator** | Bridges pure CombatEngine to UI, wraps move/attack/playCard, emits state snapshots |
| Event layer | **EventBus (typed)** | Excalibur EventEmitter with typed CombatEvents interface |
| Bridge | **Bridge** | Syncs Excalibur events → Svelte $state reactively, handles progression flow |
| UI overlay | **Svelte 5** | Screen-based architecture with CSS Grid battle UI, reads from $state, dispatches via bridge |
| Grid system | **Pure functions** | 9×5 grid BFS pathfinding, movement/attack range, corner-bracket overlay system |
| Combat engine | **Pure functions** | Turn flow, mana, draw/replace, card effects, armor, base attack, enemy AI |
| Persistence | **localStorage** | Save/load via persistence.ts, 3 save slots, full state serialization |
| Language | **TypeScript** | Strict typing throughout |
| Bundler | **Vite** | Dev server + production builds |
| Testing | **Vitest** | 236 tests, ~1.5s |

## Architecture Pattern

```
┌──────────────────────────────────────────┐
│  Svelte 5 (UI) — screen-based layout     │
│  - 7+ screen components (MainMenu,       │
│    BattleHUD, IslandMap, Shop, Rewards,  │
│    Deck, Save/Load, Settings, Dialogue)  │
│  - 9×5 CSS Grid for battle UI            │
│  - Corner-bracket overlays (70 SVGs)     │
│  - Animations: FloatingText, CardPlay,   │
│    DamageFlash                           │
│  - Reads from $state (synced via bridge) │
│  - Dispatches actions via bridge         │
├──────────────────────────────────────────┤
│  Bridge Layer (event → $state sync)      │
│  - Subscribes to eventBus                │
│  - state:changed snapshot (primary sync) │
│  - Progression: victory→rewards→zone     │
│  - Dialogue triggers, act advancement    │
│  - Animation events (damage, heal, gold) │
│  - Exposes getCurrentOrchestrator()      │
├──────────────────────────────────────────┤
│  EventBus (typed Excalibur EventEmitter) │
│  - state:changed (full snapshot)         │
│  - combat:victory / combat:defeat        │
│  - map:zoneClicked / zoneEntered/completed│
│  - anim:damage / heal / gold / cardPlayed│
├──────────────────────────────────────────┤
│  CombatOrchestrator (bridge layer)       │
│  - Wraps pure CombatEngine functions     │
│  - Manages battle lifecycle              │
│  - moveUnit, baseAttack, playCard,       │
│    endPlayerTurn, replaceCard            │
│  - Emits state:changed after each action │
│  - 12 integration tests                  │
├──────────────────────────────────────────┤
│  Pure Functions (tested, 194 tests)      │
│  Grid System:                            │
│  - GridTypes, GridFactory, GridMovement  │
│  - BFS pathfinding, diagonal cost 2      │
│  - Provoke/Flying/Walls                  │
│  - Faction model (areEnemies)            │
│  Combat Engine:                          │
│  - CombatEngine, ManaSystem, DrawSystem  │
│  - CardEffects (Attack/Armor/Skill/      │
│    Summon/Passive)                       │
│  - BaseAttack (hero + counterattack)     │
│  - ArmorSystem (temporary shield)        │
│  - EnemyAI (3 strategies, grid-aware)    │
│  - State-in, state-out, no side effects  │
├──────────────────────────────────────────┤
│  Excalibur.js (canvas)                   │
│  - IslandScene: zone markers, paths,     │
│    hero animation                        │
│  - Renders background, scene management  │
│  - @excaliburjs/plugin-spritefusion      │
│    for tile map import (future)          │
├──────────────────────────────────────────┤
│  State (campaign/combat split)           │
│  - Svelte $state synced from bridge      │
│  - RunState: persistent across campaign  │
│    (HP, gold, deck, collection, act)     │
│  - CombatState: per-battle only (grid,   │
│    hand, mana, turnPhase, enemies)       │
│  - MapState: overworld zones, unlocks,   │
│    completed zones                       │
│  - localStorage persistence: 3 save slots│
└──────────────────────────────────────────┘
```

## State Model

```
GameState
├── screen: 'menu' | 'map' | 'battle' | 'shop' | 'deck' | 'save' | 'settings' | 'dialogue' | 'death' | 'victory' | 'cardReward'
├── run: RunState (persistent across campaign)
│   ├── heroHp/maxHp, gold, deck[], collection{}
│   ├── act, relics[]
├── map: MapStateUI (overworld zone state)
│   ├── zones[], currentZone, unlockedZones[], completedZones[]
│   ├── isMoving, pendingAction?
├── combat: CombatState (per-battle, synced via bridge)
│   ├── grid (tiles[][], units, positions)
│   ├── hand[], deck[], discard[], mana, turnPhase, turnNumber
│   ├── hero (hp, maxHp, baseAttack, armor), enemies[], summons[]
│   ├── movementRange[], attackRange[], playableCards[]
│   ├── canReplace, heroHasMoved, heroHasAttacked
├── activeDialogue: { sceneId, lineIndex, visible } | null
```

## Combat Flow

```
PLAYER TURN:
1. Orchestrator.startPlayerTurn() — draw 1 card, increment mana (max 9), reset move/attack flags
2. Player actions (any order, once each):
   a. MOVE: click reachable tile → orchestrator.moveUnit() → emit snapshot
   b. PLAY CARD: select card → valid targets highlighted → click target → orchestrator.playCard()
      - Attack: deal damage to target (or AoE)
      - Armor: gain temporary shield (1 turn)
      - Skill: heal/buff
      - Summon: place allied unit on grid
      - Passive: apply battle-long effect
   c. BASE ATTACK: click adjacent enemy → orchestrator.baseAttack() → both sides trade damage
   d. REPLACE: shuffle 1 hand card back, draw new one (once per turn)
3. End turn → orchestrator.endPlayerTurn()
   a. Tick armor (decrement durations)
   b. Enemy AI acts (move → attack per strategy)
   c. Check battle end → emit victory/defeat
4. Next turn: orchestrator.startPlayerTurn()

ENEMY TURN (automated):
1. Each alive enemy decides:
   - Aggressive: move toward hero, attack if in range
   - Balanced: move toward nearest enemy, attack if in range
   - Defensive: hold position, attack if hero close
2. Enemy moves (BFS to target within moveRange)
3. Enemy attacks (melee adjacent / ranged within distance)
4. Counterattack if target survives and is adjacent
5. Dead units removed from grid
```

## File Structure

```
src/
├── game/grid/                # ★ Grid system (97 tests)
│   ├── GridTypes.ts            # GridPosition, GridTile, GridUnit, GridState
│   ├── GridFactory.ts          # createEmptyGrid, placeUnit, moveUnit, areEnemies
│   ├── GridMovement.ts         # BFS movement range, line of sight
│   ├── GridAttack.ts           # Attackable targets, adjacency
│   ├── GridDirections.ts       # Shared direction constants
│   └── __tests__/              # 3 test files
├── game/combat/              # ★ Combat engine (97 tests)
│   ├── CardTypes.ts            # CombatState, CardDefinition, CardType, UIBattleState
│   ├── CombatEngine.ts         # initBattle, playCard, startPlayerTurn, endPlayerTurn
│   ├── ManaSystem.ts           # getManaForTurn, canPlayCard, spendMana
│   ├── DrawSystem.ts           # shuffleDeck, drawCards, replaceCard
│   ├── CardEffects.ts          # resolveAttack/Armor/Skill/Summon/Passive
│   ├── BaseAttack.ts           # heroBaseAttack with counterattack
│   ├── ArmorSystem.ts          # applyArmor, tickArmor, damageWithArmor
│   ├── EnemyAI.ts              # Grid-aware AI (aggressive/balanced/defensive)
│   ├── __tests__/              # 7 test files
├── game/systems/
│   ├── CombatOrchestrator.ts   # Bridging pure functions → UI
│   └── __tests__/              # 12 integration tests
├── game/map/
│   ├── IslandTypes.ts          # ZoneDefinition, MapStateUI
│   ├── islandData.ts           # 8 zones (Guppy Cove → The Maw)
├── game/scenes/
│   ├── IslandScene.ts          # Overworld map with zones, paths, hero
│   └── BattleScene.ts          # Battle backdrop + orchestrator init
├── game/story/
│   ├── dialogueData.ts         # Campaign dialogue scenes
├── game/events.ts              # Typed EventBus (CombatEvents)
├── game/bridge.ts              # Event → $state sync + progression flow
├── game/cards/cardData.ts      # 11 starter cards
├── game/enemies/encounterData.ts
├── game/engine.ts              # Excalibur engine setup
├── ui/
│   ├── screens/                # MainMenu, BattleHUD, Shop, Rewards, Deck, Save, Settings, Death, Victory
│   ├── hud/
│   │   ├── BattleHUD.svelte     # 9×5 CSS Grid combat UI
│   │   └── MapOverlay.svelte    # Island map HUD
│   ├── battle/
│   │   ├── GridTile.svelte      # Individual grid tile component
│   │   ├── HandViewer.svelte    # Card hand display
│   │   ├── CardTooltip.svelte   # Card details tooltip
│   │   ├── DeckViewer.svelte    # Deck/discard viewer
│   │   └── zones/               # Reusable zone components
│   ├── shared/
│   │   ├── DialogueBox.svelte   # Typewriter story dialogue
│   │   └── ShopPanel.svelte     # Card shop panel
├── lib/
│   ├── state.svelte.ts          # Svelte $state runes (campaign + combat + map)
│   └── persistence.ts           # localStorage save/load (3 slots)
├── public/sprites/
│   ├── hero/                    # Guppy idle/walk/attack/hit SVGs
│   ├── enemies/                 # Crab, jellyfish, pufferfish SVGs
│   ├── cards/                   # Attack/armor/summon card art SVGs
│   ├── tiles/                   # Water/sand/stone/floor/mana-spring SVGs
│   ├── overlays/                # 70 corner-bracket overlay SVGs
│   └── ui/                      # Mana-crystal, intent icons
├── App.svelte                   # Screen router + Excalibur mount
└── app.css                      # Ocean debt city CSS variables
```

## Key Architectural Decisions

| Decision | Status | Doc |
|----------|--------|-----|
| Pure functions + CombatOrchestrator bridge | Completed | @wiki/decisions/pure-function-ecs-pivot |
| Duelyst 9×5 grid with corner-bracket overlays | Completed | @wiki/patterns/duelyst-corner-bracket-overlay-system |
| Snapshot-based state sync | Completed | @wiki/patterns/snapshot-state-sync |
| Svelte CSS Grid for battle UI (not Excalibur canvas) | Completed | @wiki/decisions/svelte-css-grid-battle-ui |
| localStorage over Prisma/SQLite for browser persistence | Completed | @wiki/decisions/browser-localstorage-persistence |
| Island map overworld (Cross Blitz style) | Completed | @wiki/patterns/island-map-overworld |
| Campaign RPG state (persistent, no roguelite reset) | Completed | @wiki/specs/fish-tactical-rpg |
| Convert to tactical RPG (roguelite → RPG) | Completed | @wiki/specs/fish-tactical-rpg |
| TDD + SDD workflow | Enforced | @wiki/rules/tdd, @wiki/rules/spec-driven-development |

## Full Spec

@wiki/specs/fish-tactical-rpg