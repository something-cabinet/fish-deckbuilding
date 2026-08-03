---
title: Overworld Map — StS-Style Branching Paths
type: spec
tags:
- spec
- overworld
- map
- progression
- game-design
status: approved
---

## Overview

Define the Slay the Spire-style branching-path overworld map for Fish Mafia. After winning a battle, the player sees a map with connected nodes (Battle, Rest, Boss) arranged in branching rows. Clicking a connected node advances the hero. Battle nodes trigger grid combat. Rest nodes heal. Boss nodes gate zone progression. Three zones (Shallows → Midwaters → Depths) with increasing difficulty.

## Locked Decisions

- D1: **Map structure** — Slay the Spire branching paths. Rows of connected nodes with 2-3 choices per row. Paths branch and merge. Hero icon animates along connections.
- D2: **Node types (Phase 1)** — Battle, Rest, Boss. Shop, Enchanter, Gambler deferred.
- D3: **Progression depth** — 3 zones (Shallows, Midwaters, Depths), 5-7 nodes per zone. Beat the Boss node to unlock the next zone. Zone 1 unlocked at start.
- D4: **State persistence** — localStorage auto-save on every node transition. No manual save/load buttons.
- D5: **HP & healing** — Hero HP carries forward between battles. Rest nodes heal 30% max HP. No post-battle auto-heal.
- D6: **Battle rewards** — After winning a Battle node: choose 1 of 3 cards + gold. Card goes to stash, gold adds to total.
- D7: **Boss fights** — Each zone has a Boss node with a unique boss unit (higher HP/ATK) replacing the standard enemy lineup.
- D8: **Deck building** — Start with a fixed starter deck (current 17 cards). After each battle win, choose 1 of 3 cards to add directly to the deck (Slay the Spire style). Deck grows over the run. No separate stash or deckbuilding screen for Phase 1.

## Requirements

### Functional Requirements

- FR-1: **Map generation** — Generate a branching node graph per zone with 5-7 rows of 2-3 nodes each. Connections form possible paths from start to boss.
- FR-2: **Node types** — Map renders Battle (red/fighting icon), Rest (green/heal icon), Boss (gold/skull icon). Node icons are visually distinct.
- FR-3: **Hero position** — A hero icon sits on the current node. Connected but unvisited nodes are highlighted as reachable (clickable).
- FR-4: **Map navigation** — Click a reachable node to travel there. Hero icon animates along the path connection.
- FR-5: **Battle node** — Clicking a Battle node transitions to the existing combat screen. On win: reward screen (choose 1 of 3 cards + gold). On defeat: return to map at same node.
- FR-6: **Rest node** — Clicking a Rest node heals the hero 30% of max HP, then returns to map. The node is marked as used (greyed out).
- FR-7: **Boss node** — Clicking a Boss node starts a boss battle with a unique boss unit. Win: unlock next zone. Defeat: return to map, can retry.
- FR-8: **Zone unlock** — After winning a zone's Boss node, the path to the next zone's first node becomes reachable. A brief story/dialogue text appears.
- FR-9: **Zone display** — Each zone has a distinct visual theme. Locked zones show a lock overlay on the entry path.
- FR-10: **Card rewards** — Post-battle reward screen shows 3 random cards from a pool. Player clicks one to add directly to their combat deck.
- FR-11: **Deck growth** — The deck screen (accessible from map HUD) shows current deck size and cards. No separate stash.
- FR-12: **Gold persistence** — Gold total carries forward, displayed on the map HUD. No shop to spend it in Phase 1 (gold is a counter for future use).
- FR-13: **Hero HP persistence** — Hero HP carries forward between battles. Displayed on the map HUD. Max HP = 14 (current hero maxHp).
- FR-14: **Auto-save** — State is saved to localStorage on every node transition. On app load, check for saved state and offer Continue / New Run.
- FR-15: **Map state** — Visited nodes are marked (greyed), current node is highlighted, unvisited reachable nodes are interactive, unreachable nodes are dimmed with a lock/blocked indicator.
- FR-16: **Victory flow** — Win battle → reward screen → return to map at current node. The Battle node is marked as cleared.
- FR-17: **Defeat flow** — Lose battle → return to map at current node (no permadeath). The Battle node is NOT marked as cleared (can retry).
- FR-18: **Run end** — Defeat on the final boss (Zone 3) ends the run. Show a run summary (turns played, cards collected, gold earned) and offer New Run.
- FR-19: **New Run** — Clears saved state, starts fresh from Zone 1 first node.

### Non-Functional Requirements

- NFR-1: Map generation must be deterministic given a seed (no randomness visible to player between renders).
- NFR-2: Node layout must fit within a 1280×720 viewport without scrolling.
- NFR-3: Save state must be < 50KB in localStorage.
- NFR-4: Transitions (map → battle, battle → reward → map) must feel instant (< 200ms perceived latency).

## Acceptance Criteria

- [ ] AC-1: Map shows a branching path with 5-7 rows of 2-3 nodes per zone
- [ ] AC-2: Battle, Rest, and Boss nodes have distinct visual styles
- [ ] AC-3: Hero icon is visible on the current node
- [ ] AC-4: Connected reachable nodes are clickable and highlighted
- [ ] AC-5: Clicking a Battle node starts a combat encounter
- [ ] AC-6: Winning a battle shows a reward screen with 3 card choices + gold
- [ ] AC-7: After reward, return to map at the current node
- [ ] AC-8: Losing a battle returns to map at current node (no permadeath)
- [ ] AC-9: Rest node heals hero 30% max HP and greys out after use
- [ ] AC-10: Boss node starts a battle with a unique boss unit
- [ ] AC-11: Winning a Boss node unlocks the next zone
- [ ] AC-12: Locked zones show a lock icon on the entry node
- [ ] AC-13: Gold total displays on map HUD and persists between battles
- [ ] AC-14: Hero HP displays on map HUD and carries forward
- [ ] AC-15: Deck screen shows current cards and deck size from map HUD
- [ ] AC-16: State is saved to localStorage on node transitions
- [ ] AC-17: On app start, existing save is detected with Continue / New Run options
- [ ] AC-18: New Run clears saved state and starts fresh
- [ ] AC-19: Visited nodes are greyed, current node highlighted
- [ ] AC-20: Defeating Zone 3 Boss shows a run summary

## Scenarios

### Scenario 1: Win Battle → Reward → Map
**Given** the player is on a Battle node
**When** they click the Battle node
**Then** the combat screen loads
**When** they win the battle
**Then** a reward overlay shows 3 random cards and a gold amount
**When** they click a card
**Then** the card is added to their deck, gold is added to total
**Then** the map returns with the Battle node marked as cleared

### Scenario 2: Navigate Branching Map
**Given** the player is on node 3 of zone 1
**When** they look at row 4
**Then** they see 2-3 connected nodes
**Only** some of them are reachable from node 3
**When** they click a reachable node
**Then** the hero icon animates along the path to the new node
**Then** the new node becomes "current"

### Scenario 3: Rest and Recover
**Given** the player has 8/14 HP and reaches a Rest node
**When** they click the Rest node
**Then** a brief "resting" animation plays
**Then** HP is restored by 30% of 14 (rounded to 4), so HP becomes 12/14
**Then** the Rest node greys out
**Then** the map returns

### Scenario 4: Zone Boss Unlock
**Given** the player is at the Zone 1 Boss node with all other nodes cleared
**When** they click the Boss node
**Then** a boss battle starts with a unique boss unit
**When** they win
**Then** a story text appears: "The waters part. A new depth beckons..."
**Then** the path to Zone 2's first node unlocks
**Then** an auto-save fires

### Scenario 5: Defeat Without Loss
**Given** the player has 6/14 HP and enters a battle
**When** they lose the battle
**Then** they return to the map at the same node
**Then** HP is still 6/14
**Then** no cards or gold are lost
**Then** the battle node is NOT greyed (can retry)

### Scenario 6: Save and Continue
**Given** the player has reached Zone 2, cleared 3 nodes, has 10 HP and 12 gold
**When** they close the browser tab
**When** they open the game again
**Then** the main menu shows "Continue" (alongside "New Run")
**When** they click Continue
**Then** the map loads at the correct node with 10 HP and 12 gold

## Technical Notes

- New file: `src/lib/game/overworld-types.ts` — Zone, MapNode, MapEdge, OverworldState, NodeType, ZoneId types
- New file: `src/lib/game/overworld-data.ts` — Zone definitions, node layouts, boss definitions, encounter pools
- New file: `src/lib/game/overworld-engine.ts` — Pure functions for map generation (seeded), state transitions, save/load
- New file: `src/components/game/overworld-map.tsx` — SVG/React node map with connections, hero icon, click handling
- New file: `src/components/game/reward-screen.tsx` — Post-battle choose-1-of-3 overlay
- New file: `src/hooks/use-overworld.ts` — Overworld state management hook
- New file: `src/components/game/save-prompt.tsx` — Continue / New Run prompt on app start
- Modified: `src/components/game/fish-mafia-app.tsx` — Add "overworld" screen, wire up transitions
- Modified: `src/components/game/fish-mafia-game.tsx` — Accept overworld callbacks for win/lose handling
- Modified: `src/components/game/result-overlay.tsx` — Add "Continue to Map" button instead of "New Racket" after win
- Modified: `src/lib/game/types.ts` — Add `heroHp` and `heroMaxHp` to GameState or keep separate in OverworldState

Map generation approach: Define each zone as a 2D grid of nodes with edges. StS style: 2-3 nodes per row, connected to 1-2 nodes in the next row. Represent as a list of `{ row, col, type, edges: [{row, col}] }` entries. Use a seed-based random for encounter/reward selection.

Save format: JSON in localStorage key `fish-mafia-save`. Contains `{ zone: number, nodeRef: string, hp: number, gold: number, deck: string[], visitedNodeRefs: string[], unlockedZones: number, seed: number }`.

## Open Questions

- [ ] OQ-1: Should defeated bosses drop bonus gold or cards? (Deferred — Phase 1 just adds the card reward + gold like normal battles for now.)
- [ ] OQ-2: Hero maxHp scaling — should defeating bosses increase maxHp? (Deferred — stays at 14 for Phase 1.)
- [ ] OQ-3: Rest node multiple uses — should it be usable once per run or once per visit? (Locked: once per node, then greyed.)
- [ ] OQ-4: Seed for map generation — should the seed be fixed per save or random per new run? (Random per new run.)