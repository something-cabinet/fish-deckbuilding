---
title: Fish Tactical RPG — Overworld + Duelyst-Style Grid Combat
type: spec
tags:
- spec
- rpg
- overworld
- grid-combat
- duelyst
- cross-blitz
status: approved
---

## Overview

This spec defines the pivot from a roguelite deckbuilder (Slay the Spire-style) to a **tactical RPG** with top-down overworld exploration and Duelyst-style 9×5 grid combat. Inspired by Cross Blitz (story campaign) and Duelyst (positional grid combat).

The game follows **Guppy the Debtor** through a story campaign across an island map. Battles play out on a 9×5 tactical grid where Guppy moves, attacks, and plays card skills from a deck.

## Locked Decisions

- D1: **Scope** — Strip to essentials. Only hero HP and cards survive from the original game. Map nodes, shops, rest sites, relics, coin/credit system are gone, rebuilt for the new design.
- D2: **Deck progression** — Start with a basic deck. Collect new cards from battle rewards + shops. Persistent collection across the campaign (no deck reset).
- D3: **Health model** — Partial heal after battles (~10 HP per battle as placeholder). Full healing system deferred (see Open Questions).
- D4: **Combat grid** — Duelyst 9×5 grid with positioning, unit movement (2 tiles/turn), adjacency-based attacks and counterattacks. Variable map sizes deferred to later design.
- D5: **Overworld structure** — Island map (Cross Blitz style). Stylized overview map, click destinations to travel, battles on localized maps.
- D6: **Battle rewards** — Earn cards (1-3 choices per win) + gold. Spend gold at shops for specific cards.
- D7: **Campaign** — Full story campaign with narrative, chapters, dialogue, zone unlocks.
- D8: **Deck/hand sizes** — RPG compact: 5 card hand, 25-30 card deck, 2 copies max per card.
- D9: **Healing** — ~10 HP heal per battle placeholder. Full system TBD (see Open Questions).
- D10: **Card types** — Attack, Armor, Skill, Summon, Passive.

## Requirements

### Functional Requirements

- FR-1: **Overworld Exploration** — Player navigates a top-down pixel art island map. Clickable destinations (towns, dungeons, shops, battle zones). Camera follows player character.
- FR-2: **Island Map Navigation** — A stylized overview map (Cross Blitz style) showing zones, paths, and unlockable areas. Click to travel between destinations. Paths blocked until story progression unlocks them.
- FR-3: **Grid Combat (9×5)** — Battles play on a 9×5 tile grid. Guppy and enemies occupy tiles. Movement: 2 tiles per turn (orthogonal, diagonal costs 2). Attacks: adjacent only (8 tiles), target counterattacks.
- FR-4: **Hero on Grid** — Guppy is an active unit on the grid with base attack (like Duelyst General). Can move and attack without spending cards.
- FR-5: **Card as Skills** — Cards in hand are skills Guppy can play for mana cost. Card types:
  - Attack: damage enemies (direct or AoE)
  - Armor: temporary shield lasting 1 turn
  - Skill: heal, buff, debuff, utility
  - Summon: place an allied unit on the grid (minion with its own HP, attack, movement)
  - Passive: permanent effect for the current battle (aura, relic-like)
- FR-6: **Mana System** — Mana +1 per turn, starting at 1, max 9. Unused mana lost at turn end.
- FR-7: **Draw System** — Draw 1 card at end of turn (Duelyst style). Hand size max 5. Discard if hand is full.
- FR-8: **Replace Mechanic** — Once per turn, shuffle 1 card from hand back into deck, draw a random one (Duelyst Replace system).
- FR-9: **Base Attack** — Guppy can attack an adjacent enemy for base damage (baseline: 2). No card required. Target always counterattacks.
- FR-10: **Deck Management** — 25-30 card deck per battle. Pre-battle deckbuilder lets you choose from collected card pool. 2 copies max per card.
- FR-11: **Card Collection** — Persistent collection grows across the campaign. Earn cards from battles (choose 1 of 3), buy from shops with gold.
- FR-12: **Campaign Progression** — Story chapters with dialogue, cutscenes. Completing chapters unlocks new zones on the island. Boss fights at chapter ends.
- FR-13: **Enemy AI** — Grid-aware AI. Per-enemy strategies (aggressive: push forward, balanced: hold position, defensive: guard/counter). Enemies move and attack on their turns.
- FR-14: **Gold Economy** — Gold earned from battles. Spent at shops on cards and (future) items/healing.
- FR-15: **Save/Load** — Full save/load at any point on the overworld. Battle state only saved at start of combat.
- FR-16: **Transition** — Overworld → Battle: seamless transition from island map to combat scene. Post-battle: return to island map with updated world state.

### Non-Functional Requirements

- NFR-1: **Performance** — 60 FPS in both overworld and combat. Excalibur.js handles 9×5 grid + tile map efficiently.
- NFR-2: **Test Coverage** — Pure game logic (combat, grid math, card effects) tested via Vitest. UI orchestration integration tests required (learned from critical patterns — untested UI layer caused all P0s).
- NFR-3: **Save Slots** — At least 3 save slots for campaign.
- NFR-4: **Accessibility** — prefers-reduced-motion respected for combat animations.

## Acceptance Criteria

- [ ] AC-1: Player can walk around a top-down island map, click destinations to travel between zones
- [ ] AC-2: Walking into an enemy on the overworld triggers a 9×5 grid combat scene
- [ ] AC-3: Combat follows Duelyst turn structure: move → act → end turn. Enemies take their turn after player.
- [ ] AC-4: Guppy can move up to 2 tiles, attack adjacent enemies for base damage, and play cards from hand
- [ ] AC-5: Cards cost mana (cost 1-9). Mana increments by +1 per turn up to 9.
- [ ] AC-6: Player draws 1 card at end of turn. Hand max 5. Replace 1/turn available.
- [ ] AC-7: Card types (Attack, Armor, Skill, Summon, Passive) all function correctly in combat
- [ ] AC-8: Armor provides temporary HP that expires after 1 turn
- [ ] AC-9: Summoned minions occupy tiles, move 2/turn, attack adjacent enemies, and can be killed
- [ ] AC-10: Passives provide a persistent effect throughout the battle
- [ ] AC-11: Winning a battle shows a reward screen with 1-3 card choices + gold
- [ ] AC-12: Player can manage their deck (25-30 cards, 2 max per card) before battles
- [ ] AC-13: Story chapters have dialogue/cutscenes and unlock new zones
- [ ] AC-14: Gold persists across the campaign; shops let you buy specific cards
- [ ] AC-15: Save/load works — progress (deck collection, gold, story flags) persists correctly
- [ ] AC-16: Losing a battle returns player to overworld (no permadeath — RPG style)
- [ ] AC-17: ~10 HP heal per battle (placeholder)

## Scenarios

### Scenario 1: Normal Battle
**Given** Guppy is exploring the overworld and walks into an enemy
**When** combat starts on a 9×5 grid
**Then** Guppy has 5 cards from her deck, 1 mana, and her turn begins
**And** Guppy can move 2 tiles, play a card, attack adjacent, or end turn
**And** enemy takes its turn (move + act)
**And** turns cycle until one side is defeated
**And** Guppy wins → reward screen (cards + gold) → return to overworld
**And** ~10 HP healed

### Scenario 2: Boss Fight
**Given** Guppy reaches a chapter-ending boss node on the island map
**When** the boss battle starts on an arena variant of the 9×5 grid
**Then** the boss has unique abilities, higher HP, and may have minions
**And** defeating the boss triggers a story cutscene and unlocks the next zone

### Scenario 3: Deck Management
**Given** Guppy has collected 40 cards across her journey
**When** she opens the deck screen before a battle
**Then** she can select up to 30 cards (max 2 per unique card)
**And** the deck is saved for the battle
**And** cards not in the deck remain in her collection

### Scenario 4: Shop Visit
**Given** Guppy has 150 gold and enters a shop on the island map
**When** she opens the shop screen
**Then** she sees available cards for purchase with gold prices
**And** she can buy cards (added to collection, available for deckbuilding)
**And** leaving returns her to the overworld

### Scenario 5: Battle Defeat
**Given** Guppy's HP reaches 0 during combat
**When** the defeat triggers
**Then** she returns to the overworld with her current HP
**And** no gold or cards are lost
**And** she can re-attempt the battle or explore elsewhere

## Technical Notes

### Architecture Impact Matrix

| Current System | Status | Replacement |
|---|---|---|
| `src/game/combat/` (pure functions) | **Revamp** | Grid combat math, grid AI, card effects |
| `src/game/systems/CombatOrchestrator.ts` | **Revamp** | Guppy turn, enemy turn, grid actions |
| `src/game/events.ts` (EventBus) | **Extend** | New combat events (move, summon, etc.) |
| `src/game/bridge.ts` | **Extend** | Sync grid state to Svelte |
| `src/game/components/` (ECS) | **Extend** | Add Position, GridMovement, Armor components |
| `src/game/cards/cardData.ts` | **Rewritten** | New card types, costs, effects |
| `src/lib/state.ts` (run/combat split) | **Rewritten** | Campaign state (persistent) + combat state |
| `src/ui/` (Svelte zones) | **Rewritten** | New HUD for grid combat + overworld UI |
| `src/game/enemies/encounterData.ts` | **Rewritten** | Grid-aware enemy data |
| `src/game/map/mapGenerator.ts` | **Removed** | Replaced by island map system |
| `src/game/scenes/` (Excalibur scenes) | **Extended** | Add MapScene (overworld), BattleScene updates |

### New Systems Needed

- **GridSystem** — 9×5 grid data structure, tile states (occupied/empty/blocked), pathfinding (BFS for movement range)
- **IslandMap** — Zone data, transition points, story gate conditions, enemy spawn definitions
- **CardEffectsSystem** — Attack/Armor/Skill/Summon/Passive effect resolution on grid
- **GridAI** — Enemy decision-making: move toward target, attack range, use special abilities, summon minions
- **DialogueSystem** — Story dialogue UI, chapter progression triggers
- **SaveSystem** — Full campaign state serialization/deserialization

### Grid Data Model (Initial)

```typescript
interface GridState {
  tiles: Tile[][]; // 9×5
  units: GridUnit[]; // all units on grid (hero + enemies + summons)
  turnPhase: 'playerMove' | 'playerAction' | 'enemyTurn';
  turnNumber: number;
}

interface GridUnit {
  id: string;
  type: 'hero' | 'enemy' | 'summon';
  position: { x: number; y: number };
  hp: number;
  maxHp: number;
  attack: number;
  armor: number; // temporary, decrements each turn
  moveRange: number; // default 2
  canAct: boolean;
  isAlive: boolean;
}
```

## Open Questions

- [ ] OQ-1: **Healing system** — How exactly does HP recovery work between battles? Potions? Rest points? Food crafting? Deferred from D9 — spec currently uses ~10 HP heal per battle as placeholder.
- [ ] OQ-2: **Mana Springs** — Do they exist in PvE grid? Duelyst has 3 center tiles granting +1 mana. Keeps players fighting for center. Optional for PvE.
- [ ] OQ-3: **Replace system** — Duelyst's 1/turn replace is included. But with 5 hand / 30 deck, does it need tuning? Maybe 2 replaces per battle instead of per-turn?
- [ ] OQ-4: **Island map detail** — Is the island map node-based (click point A→B on stylized map) or fully rendered top-down with visible character? Cross Blitz does clickable nodes on a drawn map.
- [ ] OQ-5: **Enemy variety** — How many enemy types per zone? Do enemies have decks/abilities too, or just fixed AI patterns?
- [ ] OQ-6: **Chapter length** — How many chapters? How long each? Cross Blitz has 3 chapters per character.