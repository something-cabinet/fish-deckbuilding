---
title: Zone-based UI decomposition for battle screen
type: task
tags:
- ui
- refactor
- battle
status: in-progress
priority: high
acceptance_criteria:
- text: BattleHUD.svelte reduced from 812 lines to <200 lines (layout coordinator only)
  checked: false
- text: Each zone component is independently testable
  checked: false
- text: Zone components use CSS modules/scoped styles (Svelte style blocks)
  checked: false
- text: No regressions in combat flow verified via playwriter
  checked: false
- text: Zone layout adapts to viewport width
  checked: false
implementation_notes: |-
  Plan: Decompose BattleHUD.svelte into ~9 zone components. Each zone gets its own folder under src/ui/battle/zones/{zone-name}/ with a .svelte component and scoped styles. BattleHUD becomes a CSS Grid layout coordinator (<200 lines). Modals stay as separate overlay system.

  Zone extraction order (all independent, parallel-safe):
  1. Create directories and BattleHUD layout grid
  2. Extract HeroHPZone (top-left: hero name, HP bar, relics)
  3. Extract TurnInfoZone (center: turn counter, phase badge, gold)
  4. Extract EnemyHPBarZone (top-right: enemy HP summary — currently empty in BattleHUD)
  5. Extract CoinZone (left sidebar: coins, credit limit)
  6. Extract EnemyRowZone (center: enemies, targeting hint)
  7. Extract DeckZone (right sidebar: deck count, view deck button)
  8. Extract HandZone (bottom: card hand with sell/play/block buttons)
  9. Extract ActionBarZone (END TURN, CANCEL buttons)
  10. Extract InterestFlashZone (interest damage banner)
  11. Create ModalHost overlay component
  12. Integration test and responsive layout fixup
---

Decompose the monolithic BattleHUD.svelte (812 lines) into self-contained zone components following Talishar's pattern. Zones: Hand, EnemyRow, CoinBar, DeckPile, CombatChain (turn log), HeroPortrait, PromptArea. Each zone gets its own component + scoped styles. BattleHUD becomes a layout coordinator that arranges zones.