---
{}
relates_to:
  - {type: references, target: wiki:tasks:zone-based-ui-decomposition-for-battle-screen}
---

---
title: Pattern: Zone-Based UI Decomposition
type: pattern
id: wiki:patterns:zone-based-ui-decomposition
tags: [pattern, ui, architecture, svelte]
---

---
title: Pattern: Zone-Based UI Decomposition
type: pattern
tags: [pattern, ui, architecture, svelte]
---

## Problem
Monolithic game UI components grow uncontrollably (BattleHUD.svelte: 812 lines) with mixed responsibilities — layout, state derivation, interaction handling, and modal management all in one file. Adding a feature or changing the layout requires understanding the entire component, and responsive breakpoints are tangled with component logic.

## Solution
Decompose the screen into self-contained **zone components**, each owning one visual section of the screen. A thin layout coordinator (CSS Grid) arranges zones. Modals and overlays are handled separately.

```
src/ui/battle/
├── zones/
│   ├── hero-hp/HeroHPZone.svelte       # Top-left: HP bar, relics
│   ├── turn-info/TurnInfoZone.svelte    # Top-center: turn/phase badges
│   ├── enemy-hp-bar/EnemyHPBarZone.svelte # Top-right: enemy HP summary
│   ├── coin/CoinZone.svelte             # Sidebar: coins, credit limit
│   ├── enemy-row/EnemyRowZone.svelte    # Center: enemies, targeting
│   ├── deck/DeckZone.svelte             # Sidebar: deck count, view
│   ├── hand/HandZone.svelte             # Bottom: cards + action buttons
│   ├── action-bar/ActionBarZone.svelte  # Bottom: END TURN/CANCEL
│   └── interest-flash/InterestFlashZone.svelte # Overlay: interest damage flash
├── ModalHost.svelte                     # Phase-driven modal renderer
└── BattleHUD.svelte                     # CSS Grid coordinator (<200 lines)
```

### Key Principles

1. **Feature-based folders**: Each zone gets `zones/{zone-name}/{ZoneName}.svelte` with scoped styles. No shared CSS files.
2. **CSS Grid for layout, flexbox for internals**: Grid handles the 2D zone arrangement; each zone uses flexbox for its internal content.
3. **Co-located state**: Each zone imports `gameState` and derives its own `$derived` values. No shared derived state in the parent.
4. **Bridge access at zone level**: Zones call `getCurrentOrchestrator()` directly — they don't receive callbacks through props.
5. **Modals as overlays, not zones**: A `ModalHost` component watches turn phase reactively and renders the correct modal (DefensePrompt, SellOrderPrompt, CardReward).

### Layout Pattern

```css
.battle-layout {
  display: grid;
  grid-template-columns: 160px 1fr 160px;
  grid-template-rows: auto 1fr auto auto;
  grid-template-areas:
    "hero-hp   turn-info  enemy-hp"
    "coin      enemy-row  deck"
    "hand      hand       hand"
    "actions   actions    actions";
  gap: 0;
}

/* Responsive: collapse to single column on mobile */
@media (max-width: 768px) {
  .battle-layout {
    grid-template-columns: 1fr;
    grid-template-areas:
      "hero-hp"
      "enemy-row"
      "hand"
      "actions";
  }
  /* Sidebars (coin, deck) become hidden or inline */
}
```

## When to Use
- Game screens with distinct visual sections (HUD, hand, enemies, sidebar)
- SPAs where components grow past 300 lines
- Any screen that needs responsive breakpoints restructuring the layout

## When Not to Use
- Simple forms or dialogs (over-engineering)
- Components with fewer than 3 distinct visual sections
- Prototypes where rapid iteration matters more than structure

## Related
- @task-tasks:zone-based-ui-decomposition-for-battle-screen
- @wiki/specs:zone-based-ui-decomposition