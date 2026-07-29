---
title: Fish Roguelite Deckbuilding Game
type: spec
tags:
- game
- excaliburjs
- svelte5
- roguelike
- deckbuilder
status: superseded
implementation_notes: 'Superseded: engine pivoted from Excalibur.js + Svelte 5 to Godot 4 + godot-rust (gdext)/Rust. Design intent carried forward in wiki:specs:fish-tactical-rpg; current implementation baseline is wiki:specs:godot-battle-scaffold. Kept for historical reference only — do not implement against this spec''s Architecture section.'
---

## Overview

A roguelite deckbuilding RPG about a fish hero (Guppy the Debtor) trying to pay off debt in an underwater city. Built with Excalibur.js (ECS + events) + Svelte 5 (UI overlay). Combat is Slay the Spire-style direct targeting with a FaB-inspired coin resource system.

## Locked Decisions

- D1: **StS-style combat** — no grid, direct targeting (click enemy to attack)
- D2: **FaB coin resource system** — sell cards for coins, reset each turn. Credit limit -5. Interest damage if in debt.
- D3: **Sell pile ordering** — sold cards go to sellPile; at end of turn player reorders them → bottom of deck
- D4: **3-purpose cards** — SELL (for coins), PLAY (as attack), BLOCK (for defense on enemy turn)
- D5: **Debt/finance theme** — underwater city, fish, coins, credit, interest
- D6: **Canvas + Svelte overlay** — Excalibur renders game world + ECS; Svelte renders UI chrome
- D7: **Hero off-grid** — hero is abstract entity with HP. No grid, no position.
- D8: **Guppy the Debtor** — HP 30, Max Hand 4, Credit Limit -5
- D9: **Card types** — Attack, Defense, Equipment, Recruit
- D10: **Keywords** — lifesteal, pierce, double_strike
- D11: **Effects** — damage, heal, draw, gainCoins, applyBuff, applyDebuff
- D12: **Relics** — functional with triggers: onTurnStart, onCombatStart, onCardPlayed, onDamageTaken, onEnemyKilled
- D13: **Enemy AI** — per-unit with strategies: aggressive, balanced, defensive
- D14: **TDD** — Red-Green-Refactor for all game logic. UI components excluded.
- D15: **Placeholder primitives** — colored shapes, art added post-MVP

## Hero: Guppy the Debtor

| Stat | Value |
|------|-------|
| HP | 30 |
| Max Hand | 4 |
| Credit Limit | -5 (max debt) |
| Innate Skill | Overdraft — coins can go negative to credit limit |

### Starter Deck (10 cards)

| Card | Qty | Cost | ATK | DEF | Coin | Role |
|------|-----|------|-----|-----|------|------|
| Fin Slash | 3 | 1 | 3 | 1 | 1 | Cheap attack |
| Bubble Shield | 2 | 1 | 1 | 4 | 1 | Strong block |
| Ink Cloud | 2 | 1 | 2 | 2 | 2 | Versatile |
| Desperate Strike | 1 | 2 | 5 | 1 | 1 | Big hit |
| Take Cover | 1 | 1 | 1 | 3 | 2 | Reliable block/coin |
| Small Loan | 1 | 0 | 0 | 0 | 3 | Pure coin (sell for 3) |

## Combat Flow

```
PLAYER TURN:
1. Draw hand to maxHand (4 for Guppy)
2. Start with 0 coins
3. Player actions (any order, any number):
   a. SELL card → goes to sellPile (ordered at end of turn) → gain coins = coinValue
   b. PLAY attack card → costs coins (can go negative to -credit limit) → click enemy target → deal damage + resolve effects + keywords
4. End turn → if sellPile has cards → prompt to order them → cards go to bottom of deck
5. If coins < 0 → take interest damage = |debt|
6. Coins reset to 0

ENEMY TURN:
1. Each alive enemy gets an action from EnemyAI (attack/defend based on strategy)
2. Show intent per enemy (DMG or DEF value)
3. Player blocks: select cards from hand to discard for defense value
4. Unblocked damage hits hero
5. Dead enemies removed, check victory/defeat
6. Next player turn

DECK CYCLE: battleDeck (copy of run deck) — sold cards go to bottom, played/blocked cards to battleDiscard. When empty, shuffle discard back.
```

## Architecture

```
src/
  game/combat/           # Excalibur ECS + events (being rewritten)
    CombatController.ts  # State machine (pure functions → becoming ECS Systems)
    CoinSystem.ts        # Sell/spend/credit/interest
    TurnFlow.ts          # Draw, startBattle, phase management
    EnemyAI.ts           # Per-unit AI with strategies
    Keywords.ts          # Keyword resolution (lifesteal, pierce, etc.)
    Effects.ts           # Effect resolution (damage, heal, draw, coins)
    RelicSystem.ts       # Relic trigger processing
    CardTypes.ts         # All type definitions
    __tests__/           # 79 tests
  game/cards/            # 39 card definitions
  game/enemies/          # 6 encounter definitions
  game/relics/           # 5 functional relic definitions
  game/map/              # Seeded map generation
  ui/                    # Svelte 5 components
    screens/             # MainMenu, RestScreen, DeathScreen, VictoryScreen
    hud/                 # BattleHUD, MapOverlay, CoinDisplay
    battle/              # EnemyRow, HandViewer, DefensePrompt, SellOrderPrompt
    shop/                # ShopPanel
  lib/                   # Svelte $state runes (run/combat split)
  App.svelte             # Screen router + Excalibur mount
```

## Requirements (updated)

- FR-1: Start run as Guppy (HP 30, Hand 4, Credit Limit -5)
- FR-2: Procedural map with branching paths (combat, elite, shop, rest, boss)
- FR-3: Draw to max hand, sell cards for coins (FaB-style reset each turn)
- FR-4: Play attack cards → click enemy target → deal damage
- FR-5: Credit limit: borrow up to -5 coins. Interest damage = |debt| at end of turn
- FR-6: Sell pile: sold cards go to temp pile, player orders at end of turn → bottom of deck
- FR-7: Block: on enemy turn, discard cards from hand for defense value
- FR-8: Enemy AI with per-unit strategies (aggressive/balanced/defensive)
- FR-9: Keywords: lifesteal, pierce, double_strike
- FR-10: Effects: damage, heal, draw, gainCoins
- FR-11: Functional relics with triggers (onTurnStart, onCombatStart, etc.)
- FR-12: Card rewards after victory (choose 1 of 3)
- FR-13: Win: defeat boss. Lose: hero HP 0
- FR-14: Rest, shop, map navigation
- FR-15: Meta-progression (post-MVP)

## Acceptance Criteria

- [ ] AC-1: Draw hand, sell cards, gain coins, play attacks
- [ ] AC-2: Borrow up to credit limit, take interest damage if in debt
- [ ] AC-3: Sell pile ordering at end of turn
- [ ] AC-4: Block on enemy turn by discarding cards for defense value
- [ ] AC-5: Enemy AI varies by strategy (aggressive/balanced/defensive)
- [ ] AC-6: Keywords work: lifesteal heals, pierce ignores block, double_strike doubles
- [ ] AC-7: Effects work: heal, draw, gainCoins
- [ ] AC-8: Relics trigger at correct moments
- [ ] AC-9: Hero HP 0 = death. Boss dead = victory
- [ ] AC-10: Card rewards after victory (choose 1 of 3)
- [ ] AC-11: Rest (heal or upgrade), shop (buy/remove), map navigation
- [ ] AC-12: Run persistence across battles (HP, deck, gold, relics)
- [ ] AC-13: 79+ tests passing, build passes