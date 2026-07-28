---
title: Fish Roguelite Deckbuilding — README
type: core
tags: [core, readme]
---

# Fish Tactical RPG

A tactical RPG about **Guppy the Debtor** — a fish trying to pay off debt in an underwater city. Features overworld exploration (Cross Blitz style) and Duelyst-style 9×5 grid combat. Built with Excalibur.js + Svelte 5.

## Quick Start

```bash
npm install
npm run dev       # dev server on localhost:5173
npm test          # 236 tests, ~1.5s
npm run build     # production build
npm run check     # svelte-check
```

## Core Gameplay

**Overworld:** Cross Blitz-style island map. Click zones to travel. Story-gated progression through 8 zones from Guppy Cove to The Maw.

**Combat:** Duelyst-style 9×5 grid. Move 2 tiles per turn. Attack adjacent enemies. Cards are skills costing mana (max 9, +1 per turn). Counterattacks always happen.

**Cards:** 5 types — Attack (damage), Armor (temporary shield, 1 turn), Skill (heal/buff/utility), Summon (place allied unit on grid), Passive (battle-long effect). Draw 1 per turn, replace 1 per turn. Hand max 5. Deck: 25-30 cards, 2 copies max per card.

**Hero (Guppy):** 30 HP, base attack 2, active on grid like a Duelyst General. Mana +1 per turn.

**Replace System:** Duelyst-style — once per turn, shuffle 1 hand card back into deck, draw a random one.

## Hero: Guppy the Debtor

| Stat | Value |
|------|-------|
| HP | 30 |
| Base Attack | 2 |
| Hand Size | 5 |
| Mana | +1/turn (max 9) |

Starter deck: 11 cards (Fin Slash, Bite, Ink Cloud, Scale Shield, Shell Up, Small Heal, Battle Fury, Summon Shrimp, Summon Crab, Tail Whip, Coral Aura).

## Current State

- 9×5 grid with BFS movement, diagonal cost 2, Provoke/Flying/Walls
- 5 card types with 11 starter cards
- 8-zone island map with story progression (3 dialogues)
- 7 screens: MainMenu, Shop, Rewards, Deck, Save/Load, Settings, Death/Victory
- 3 save slots via localStorage
- 236 tests passing, 0 tsc errors, 0 svelte-check errors
- TDD + SDD workflow enforced
- Sprite Fusion tilemap editor compatible (@excaliburjs/plugin-spritefusion)

## Key Files

| Path | Purpose |
|------|---------|
| `src/game/grid/` | Grid system (97 tests) |
| `src/game/combat/` | Combat engine (97 tests) |
| `src/game/systems/CombatOrchestrator.ts` | Bridge logic → UI |
| `src/game/map/` | Island map zones and data |
| `src/game/scenes/IslandScene.ts` | Overworld map rendering |
| `src/game/story/dialogueData.ts` | Campaign dialogue |
| `src/lib/state.svelte.ts` | Campaign + combat + map state |
| `src/ui/` | All screen components + HUD |
| `public/sprites/` | 90+ visual assets (sprites + overlays) |
| `AGENTS.md` | Project rules (SDD + TDD) |
| `wiki:specs:fish-tactical-rpg` | Game spec |

## Full Spec

@wiki/specs/fish-tactical-rpg