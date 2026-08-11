---
title: Zone-Based UI Decomposition for Battle Screen
type: spec
tags:
- ui
- refactor
- battle
- zones
status: superseded
implementation_notes: 'Superseded: this spec decomposes BattleHUD.svelte, which no longer exists — engine moved to Godot 4 + godot-rust (gdext). Corresponding task was removed from the board. No Godot equivalent needed unless the Godot battle UI grows complex enough to warrant its own scene-decomposition spec.'
---

---
title: Zone-Based UI Decomposition for Battle Screen
type: spec
tags: [ui, refactor, battle, zones]
status: draft
---

## Overview

Decompose the monolithic BattleHUD.svelte (812 lines) into ~9 self-contained zone components following Talishar-FE's zone-based architecture pattern. Each zone owns its visual section, state derivation, and interaction handlers. BattleHUD becomes a thin layout coordinator.

## Locked Decisions

- D1: **Fine-grained zones** — Each visual section becomes its own component (<150 lines each)
- D2: **Hybrid layout** — CSS Grid for main 3-column split (sidebar/enemies/sidebar-r), flexbox inside zones
- D3: **Feature-based folders** — `src/ui/battle/zones/{zone-name}/` with component + CSS module
- D4: **Separate overlay system** — Modals (DefensePrompt, SellOrderPrompt, CardReward) stay as overlay components, not grid zones

## Zone Map

```
┌──────────────────────────────────────────────────┐
│  HeroHPZone     TurnInfoZone     EnemyHPBarZone   │
├──────────┬──────────────────────────┬─────────────┤
│ CoinZone │   EnemyRowZone           │ DeckZone    │
│          │   (enemy cards + target) │             │
├──────────┴──────────────────────────┴─────────────┤
│  HandZone (cards + sell/play/block actions)       │
│  ActionBarZone (END TURN / CANCEL buttons)        │
├──────────────────────────────────────────────────┤
│  Modals: DefensePrompt, SellOrderPrompt,          │
│  CardReward (overlay, not grid)                   │
└──────────────────────────────────────────────────┘
```

## Requirements

### Functional Requirements
- FR-1: BattleHUD.svelte reduced from 812 lines to <200 lines (layout coordinator only)
- FR-2: Nine zone components each <150 lines
- FR-3: Each zone handles its own state derivation (no $derived in BattleHUD for zone-specific data)
- FR-4: Zone interaction handlers call through bridge (getCurrentOrchestrator()) — no duplication of game logic
- FR-5: CSS Grid layout with template areas, responsive breakpoints for mobile
- FR-6: Modal overlay system renders correct modal based on turn phase (defense → DefensePrompt, sellOrder → SellOrderPrompt, victory → CardReward)

### Non-Functional Requirements
- NFR-1: All combat flows verified via playwriter (sell, attack, end turn, defend, victory, death)
- NFR-2: 0 TypeScript errors, 0 svelte-check errors
- NFR-3: 92 existing tests continue to pass
- NFR-4: Zone components independently readable (a developer should understand a zone's purpose from its file alone)

## Acceptance Criteria

- [ ] AC-1: BattleHUD.svelte is <200 lines, imports and arranges zone components
- [ ] AC-2: Nine zone directories created under `src/ui/battle/zones/`:
  - `hero-hp/`, `turn-info/`, `enemy-hp-bar/`, `coin/`, `enemy-row/`, `deck/`, `hand/`, `action-bar/`, `interest-flash/`
- [ ] AC-3: Modal overlay system renders defense/sellOrder/cardReward modals reactively
- [ ] AC-4: CSS Grid layout matches current visual layout exactly
- [ ] AC-5: All zone interactions work (sell, play, target, block, end turn, defend)
- [ ] AC-6: 92 tests pass, 0 svelte-check errors
- [ ] AC-7: Responsive layout tested at 1440px, 1024px, 768px, 375px viewports
- [ ] AC-8: Playwriter test confirms full battle cycle works

## Scenarios

### Scenario 1: Full Battle Cycle
**Given** the player clicks a combat node on the map
**When** the battle screen loads
**Then** all zones render in correct grid positions:
  - HeroHPZone shows 30/30
  - TurnInfoZone shows TURN 1
  - CoinZone shows 0 coins
  - EnemyRowZone shows enemies with HP bars
  - HandZone shows 4 cards with SELL/ATK buttons
  - ActionBarZone shows END TURN button
**When** player sells a card, then plays an attack, then ends turn
**Then** sellOrder modal appears (if cards sold), defense modal appears
**When** player confirms block
**Then** next turn starts, zones update with fresh state

### Scenario 2: Mobile Viewport
**Given** the viewport is 375px wide
**When** the battle screen loads
**Then** zones stack vertically: top bar → enemies → hand → actions
**When** the player interacts
**Then** touch targets are minimum 44px

### Scenario 3: No Sell Pile
**Given** the player has not sold any cards this turn
**When** the player clicks END TURN
**Then** no sellOrder modal appears — combat proceeds directly to defense phase

## Technical Notes

- Use existing component logic where possible — this is a structural decomposition, not a rewrite
- Reference Talishar clone at `.slim/clonedeps/repos/Talishar-FE/src/routes/game/components/zones/` for zone patterns
- Each zone gets a `{ZoneName}.svelte` + `{ZoneName}.module.css` (or Svelte scoped styles)
- Bridge imports (`getCurrentOrchestrator`) should be at the zone level, not the layout level
- CSS Grid template areas defined in a shared `battle-layout.css` or in BattleHUD.svelte's style block
- Responsive breakpoints: >1024px (3-column grid), 768-1024px (2-column), <768px (single column stack)

## Open Questions

- [ ] Should interest flash animation be its own zone component or inline in HeroHPZone?
- [ ] Should CoinZone include the credit limit display or be a separate element?

## References

- @wiki/patterns/turn-based-ecs-orchestrator
- @task-tasks:dynamic-hand-overlap-for-variable-card-count
- @task-tasks:card-visual-states-and-hover-interactions
- Talishar-FE: `src/routes/game/components/zones/` (.slim/clonedeps/repos/Talishar-FE/)