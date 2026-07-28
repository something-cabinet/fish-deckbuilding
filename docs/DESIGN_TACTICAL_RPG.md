# Fish Debt — Tactical RPG UI & Sprite Design Document

**Version:** 1.0  
**Date:** 2026-07-28  
**Stack:** Excalibur.js (canvas) + Svelte 5 (UI overlay) + TypeScript  
**Theme:** Ocean debt city — Guppy the Debtor  
**Style:** Pixel art tactical RPG (Cross Blitz overworld + Duelyst grid combat)

---

## 1. Design Philosophy

### Visual Identity
- **Atmosphere:** Deep ocean pressure meets bureaucratic dread. Bioluminescent accents against crushing darkness.
- **Style:** Pixel art with modern UI polish. Not retro for retro's sake — pixel art because it reads clearly at small sizes on a tactical grid.
- **Mood:** Tense but whimsical. A fish in a suit fighting debt collectors underwater.

### Layer Architecture
```
Layer 0: Excalibur Canvas (game world — grid, sprites, tilemap, VFX)
Layer 1: Svelte UI Overlay (HUD, menus, floating text, modal screens)
Layer 2: Svelte Modal/Dialog Layer (fullscreen screens, dialogue, rewards)
```

All UI colors flow through CSS variables in `app.css`. No hardcoded hex values in components.

---

## 2. CSS Variable System

### 2.1 Existing Variables (keep)
All current variables in `app.css` are preserved. The following new variables are added.

### 2.2 New Color Variables

Add these to `app.css` `:root`:

```css
/* === TACTICAL RPG EXPANSION === */

/* Grid & board */
--grid-tile-size: 64px;
--grid-gap: 2px;
--board-bg: rgba(10, 22, 40, 0.95);
--tile-water: #0d2b4a;
--tile-sand: #1a3a5c;
--tile-stone: #162a40;
--tile-floor: #0f2236;
--tile-mana-spring: rgba(45, 212, 191, 0.15);

/* Grid state overlays */
--tile-hover: rgba(255, 255, 255, 0.12);
--tile-move-range: rgba(59, 130, 246, 0.3);
--tile-attack-range: rgba(232, 93, 78, 0.35);
--tile-valid-target: rgba(34, 197, 94, 0.3);
--tile-blocked: rgba(239, 68, 68, 0.2);
--tile-selected: rgba(244, 196, 48, 0.4);

/* Unit chrome */
--unit-hp-bar-height: 4px;
--unit-hp-bar-width: 48px;
--unit-hp-green: #22c55e;
--unit-hp-yellow: #fbbf24;
--unit-hp-red: #ef4444;
--unit-armor-color: #60a5fa;
--unit-active-glow: rgba(244, 196, 48, 0.6);
--unit-enemy-glow: rgba(232, 93, 78, 0.4);

/* Mana system */
--mana-fill: #3b82f6;
--mana-empty: rgba(59, 130, 246, 0.15);
--mana-spring-bonus: #2dd4bf;
--mana-max: 5; /* visual reference only */

/* Intent icons */
--intent-attack: #ef4444;
--intent-defend: #3b82f6;
--intent-buff: #22c55e;
--intent-debuff: #a855f7;
--intent-special: #fbbf24;

/* Overworld map */
--map-ocean: #0a1628;
--map-land: #1a3a5c;
--map-path: rgba(232, 220, 197, 0.25);
--map-path-locked: rgba(255, 255, 255, 0.06);
--map-zone-marker: var(--gold);
--map-zone-locked: var(--parchment-dim);
--map-hero-trail: rgba(244, 196, 48, 0.4);

/* Card system (tactical hand) */
--card-width: 140px;
--card-height: 200px;
--card-bg: var(--deep);
--card-border: rgba(232, 220, 197, 0.15);
--card-border-hover: var(--coral);
--card-border-selected: var(--gold);
--card-mana-cost-bg: var(--unit-blue);
--card-art-height: 80px;

/* Screen backgrounds */
--screen-overlay: rgba(10, 22, 40, 0.92);
--screen-panel: rgba(15, 34, 54, 0.95);
--dialogue-bg: rgba(10, 22, 40, 0.88);

/* Floating text */
--float-damage: #ef4444;
--float-heal: #22c55e;
--float-gold: #f4c430;
--float-mana: #3b82f6;
--float-crit: #ff6b5e;
```

### 2.3 Typography Variables

```css
/* === TYPOGRAPHY === */
--font-display: 'Press Start 2P', 'VT323', monospace;
--font-body: 'Segoe UI', system-ui, sans-serif;
--font-pixel: 'VT323', 'Courier New', monospace;

--text-size-xs: 0.625rem;   /* 10px - stat numbers, mana costs */
--text-size-sm: 0.75rem;    /* 12px - labels, tooltips */
--text-size-md: 0.875rem;   /* 14px - body, card text */
--text-size-lg: 1.125rem;   /* 18px - headers, dialogue */
--text-size-xl: 1.5rem;     /* 24px - titles, turn counters */
--text-size-display: 2rem;  /* 32px - screen titles */
```

**Font loading:** Add Google Fonts link for `Press Start 2P` and `VT323` in `index.html`:
```html
<link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&family=VT323&display=swap" rel="stylesheet">
```

---

## 3. Overworld UI (Island Map)

### 3.1 Screen: MapOverlay.svelte (redesign)

**Layout:** Fullscreen. Canvas renders the stylized map background. Svelte overlay renders interactive nodes, hero avatar, and HUD.

```
┌─────────────────────────────────────────────┐
│  ┌─────────┐                                │
│  │ HP 30/30│  CHAPTER I: THE SHALLOWS       │
│  │ GOLD 50 │                                │
│  └─────────┘                                │
│                                             │
│           ╭────╮                            │
│     ──────│BOSS│──────                      │
│           ╰────╯                            │
│      ╱    ╱    ╲                           │
│   ╭──╮  ╭──╮  ╭──╮                         │
│   │S1│  │S2│  │S3│    ← Shop markers       │
│   ╰──╯  ╰──╯  ╰──╯                        │
│      ╲    │    ╱                           │
│   ╭──╮  ╭──╮  ╭──╮                         │
│   │E1│  │E2│  │E3│    ← Elite markers     │
│   ╰──╯  ╰──╯  ╰──╯                        │
│      ╲    │    ╱                           │
│   ╭──╮  ╭──╮  ╭──╮                         │
│   │C1│  │C2│  │C3│    ← Combat markers     │
│   ╰──╯  ╰──╯  ╰──╯                        │
│          ╲│╱                               │
│           🐟   ← Hero avatar (moves here)   │
│                                             │
│  [DECK 25]  [RELICS 3]  [SETTINGS]          │
└─────────────────────────────────────────────┘
```

**Zone Marker Types:**
| Type | Shape | Color Variable | Size |
|------|-------|----------------|------|
| Start | Circle with ring | `--unit-blue` | 24px |
| Combat | Diamond | `--coral` | 20px |
| Elite | Diamond with inner dot | `--hp-enemy` | 24px |
| Shop | Square with coin icon | `--gold` | 20px |
| Rest | Circle with cross | `--stat-def` | 20px |
| Boss | Star / ornate shape | `--hp-bar` | 32px |
| Boss Gate | Gated arch (locked until prev cleared) | `--parchment-dim` | 36px |

**Path Lines:**
- SVG paths connecting nodes
- Unlocked: `--map-path`, 2px, dashed stroke with `stroke-dasharray: 6 4`, animated with CSS `@keyframes path-flow` (subtle marching ants)
- Locked: `--map-path-locked`, 1px, solid
- Traversed: `--map-hero-trail`, 3px, solid, persistent

**Hero Avatar:**
- 32×32 pixel art sprite of Guppy (small fish in suit)
- Positioned at current node
- Moving: CSS `@keyframes hero-bob` — gentle vertical float, 2s infinite
- CSS transition for position changes: `transition: left 0.6s ease-out, top 0.6s ease-out`

**Node Interaction States:**
| State | Visual |
|-------|--------|
| Default | Solid shape, 1px border `--panel-border` |
| Hover | Scale 1.2, glow shadow, border `--parchment` |
| Current | Pulsing gold ring, `@keyframes node-pulse` |
| Reachable | Full opacity, cursor pointer |
| Locked | 0.3 opacity, grayscale, cursor not-allowed |
| Cleared | 0.4 opacity, checkmark overlay |

**Bottom HUD Bar:**
- Height: 56px
- Background: `--screen-panel` with top border `--panel-border`
- Left: HP bar (compact), Gold count
- Center: Deck count button, Relic count button
- Right: Settings gear icon

### 3.2 Map Canvas Background (Excalibur)

The Excalibur `MapScene` renders:
- Stylized ocean background (deep blue gradient, subtle wave patterns)
- Island silhouettes at node positions (decorative, non-interactive)
- Ambient particle effects (bubbles rising, very subtle)
- All interactive elements are Svelte overlay

---

## 4. Combat UI (9×5 Grid)

### 4.1 Overall Combat Screen Layout

```
┌─────────────────────────────────────────────────────────────┐
│ TURN 3  [MOVE PHASE]                    MANA: ●●●○○  [?]   │ ← Top bar
├─────────────────────────────────────────────────────────────┤
│                                                             │
│    ┌─┐┌─┐┌─┐┌─┐┌─┐┌─┐┌─┐┌─┐┌─┐                            │
│    │ ││ ││ ││E││E││ ││ ││ ││ │  ← Enemy back row (y=0-1)   │
│    ├─┼─┼─┼─┼─┼─┼─┼─┼─┤                                    │
│    │ ││ ││ ││ ││ ││ ││ ││ │                                │
│    ├─┼─┼─┼─┼─┼─┼─┼─┼─┤  ← Middle rows (y=2-3)            │
│    │ ││ ││ ││ ││ ││ ││ ││ │                                │
│    ├─┼─┼─┼─┼─┼─┼─┼─┼─┤                                    │
│    │ ││H││ ││ ││ ││ ││ ││ │  ← Hero row (y=4)             │
│    └─┘└─┘└─┘└─┘└─┘└─┘└─┘└─┘└─┘                            │
│                                                             │
│         9 columns × 5 rows = 45 tiles                       │
│         Each tile: 64×64px with 2px gap                     │
│         Total board: 594×324px                              │
├─────────────────────────────────────────────────────────────┤
│ ┌───┐┌───┐┌───┐┌───┐┌───┐  [REPLACE]  [END TURN]          │ ← Hand
│ │C1 ││C2 ││C3 ││C4 ││C5 │                                  │
│ └───┘└───┘└───┘└───┘└───┘  Deck:20  Discard:8             │
└─────────────────────────────────────────────────────────────┘
```

**Responsive breakpoints:**
- Desktop (>1024px): Full layout as above
- Tablet (768-1024px): Grid shrinks to 48×48 tiles, hand stacks 3+2
- Mobile (<768px): Grid 40×40 tiles, hand becomes horizontal scroll, bottom bar collapses to icons

### 4.2 Grid Tile System (Excalibur Canvas)

**Tile Specifications:**
| Property | Value |
|----------|-------|
| Size | 64×64px (desktop), 48×48px (tablet), 40×40px (mobile) |
| Gap | 2px between tiles |
| Sprite | 64×64 pixel art tile texture |
| Border | 1px inner border, color varies by state |

**Tile Types (pixel art sprites):**
| Type | Color Base | Pattern |
|------|-----------|---------|
| Water (default) | `--tile-water` | Subtle wave lines, darker at edges |
| Sand | `--tile-sand` | Grain texture, lighter center |
| Stone | `--tile-stone` | Brick/cobble pattern |
| Floor | `--tile-floor` | Wood planks, warm tone |
| Mana Spring | `--tile-mana-spring` | Glowing cyan center, ripple rings |

**Tile States (CSS-like rendering in Excalibur):**
Each tile state overlays a colored rectangle with blend mode:

| State | Overlay Color | Blend | Animation |
|-------|--------------|-------|-----------|
| Empty | transparent | — | — |
| Hover | `--tile-hover` | normal | — |
| Move Range | `--tile-move-range` | normal | `@keyframes tile-pulse` 2s infinite |
| Attack Range | `--tile-attack-range` | normal | `@keyframes tile-pulse` 2s infinite |
| Valid Target | `--tile-valid-target` | normal | `@keyframes tile-pulse-fast` 1s infinite |
| Blocked | `--tile-blocked` | normal | — |
| Selected | `--tile-selected` | normal | `@keyframes tile-glow` 1.5s infinite |
| Occupied (ally) | rgba(59,130,246,0.1) | normal | — |
| Occupied (enemy) | rgba(232,93,78,0.1) | normal | — |

**Tile CSS Animations (for Svelte overlay tiles, if used):**
```css
@keyframes tile-pulse {
  0%, 100% { opacity: 0.6; }
  50% { opacity: 1; }
}
@keyframes tile-pulse-fast {
  0%, 100% { opacity: 0.7; }
  50% { opacity: 1; }
}
@keyframes tile-glow {
  0%, 100% { box-shadow: inset 0 0 8px var(--tile-selected); }
  50% { box-shadow: inset 0 0 16px var(--tile-selected); }
}
```

### 4.3 Unit Sprites on Grid

**Hero Unit (Guppy):**
- Size: 48×48px rendered on 64×64 tile (centered, slight overlap into adjacent tiles allowed)
- Base sprite: 32×32 pixel art, scaled up with `image-rendering: pixelated`
- Position: anchored to tile center, y-offset -8px (appears to stand "on" tile)

**Unit Chrome (Svelte overlay per unit):**
```
    ┌────────────┐
    │   [ART]    │  ← 48×48 sprite
    │            │
    ├────────────┤
    │██████░░░░░░│  ← HP bar: 48×4px, color by %
    │   🛡️ 2     │  ← Armor indicator (if > 0)
    └────────────┘
         ⚔️        ← Intent icon (enemies only), 16×16, positioned below
```

**HP Bar Colors:**
- >60%: `--unit-hp-green`
- 30-60%: `--unit-hp-yellow`
- <30%: `--unit-hp-red`

**Active Unit Glow:**
- CSS `box-shadow: 0 0 12px var(--unit-active-glow)`
- `@keyframes active-pulse`: shadow radius oscillates 8px ↔ 16px, 1.5s infinite

**Intent Icons (enemies):**
| Intent | Icon | Color |
|--------|------|-------|
| Attack | Crossed swords ⚔️ | `--intent-attack` |
| Defend | Shield 🛡️ | `--intent-defend` |
| Buff | Up arrow ⬆️ | `--intent-buff` |
| Debuff | Down arrow ⬇️ | `--intent-debuff` |
| Special | Star ✦ | `--intent-special` |

Intent icons are 16×16 pixel art, positioned 4px below the unit sprite. They bounce gently with `@keyframes intent-bob` (1s infinite, translateY -2px ↔ 0).

### 4.4 Hand Viewer (Bottom Panel)

**Card Component Specifications:**

```
┌─────────────────┐
│  [2]            │  ← Mana cost circle, 20×20px, top-left
│                 │
│  ┌───────────┐  │
│  │           │  │  ← Card art: 120×80px pixel art
│  │   [ART]   │  │
│  │           │  │
│  └───────────┘  │
│                 │
│  Card Name      │  ← 14px bold, var(--parchment)
│                 │
│  Deal 5 damage  │  ← 12px regular, var(--parchment-dim)
│  to target.     │
│                 │
│  ⚔️5  🛡️2      │  ← Stat icons, bottom
└─────────────────┘
       140×200px
```

**Card States:**
| State | Visual |
|-------|--------|
| Default | Border `--card-border`, bg `--card-bg` |
| Hover | Scale 1.08, translateY -12px, border `--card-border-hover`, shadow 0 8px 24px rgba(0,0,0,0.4). Transition: all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1) |
| Selected | Border `--card-border-selected`, glow shadow, slight rotation ±2deg |
| Unplayable (insufficient mana) | Grayscale(0.7), opacity 0.6, cursor not-allowed |
| Being Replaced | `@keyframes card-shuffle`: translateX ±20px, opacity flicker, 0.3s |

**Hand Layout:**
- 5 cards maximum, fanned horizontally
- Card overlap: 20px (each card covers 20px of the previous)
- On hover: hovered card rises above others (z-index boost), overlap reduces to 0px
- Container height: 240px (allows for hover expansion)

**Mana Cost Display:**
- Circle badge, 20×20px, bg `--card-mana-cost-bg`
- Text: `--font-pixel`, 14px, white
- If cost > current mana: badge turns gray, strikethrough number

### 4.5 Mana Bar

```
MANA: ● ● ● ○ ○  (+1 Spring)
```

- 5 crystal orbs in a row, each 16×16px
- Filled: `--mana-fill`, glowing center
- Empty: `--mana-empty`, dim outline
- Mana Spring bonus: Extra orb in `--mana-spring-bonus`, pulsing
- `@keyframes mana-glow`: filled orbs have subtle pulse (box-shadow oscillation)

### 4.6 Turn Info Bar (Top)

```
┌────────────────────────────────────────────────────────┐
│  TURN 3          [ MOVE PHASE ]          MANA ●●●○○  ?  │
└────────────────────────────────────────────────────────┘
```

- Height: 48px
- Background: `--screen-panel`
- Border bottom: `--panel-border`
- Left: Turn counter, pixel font, `--text-accent`
- Center: Phase badge (Move / Action / Enemy). Badge bg changes by phase:
  - Move: `--unit-blue`
  - Action: `--coral`
  - Enemy: `--hp-enemy`
- Right: Mana orbs + help icon

**Phase Transition Animation:**
- `@keyframes phase-slide`: new phase badge slides in from right, old slides out left, 0.3s

### 4.7 Action Buttons

**End Turn Button:**
- Position: right side of hand panel
- Size: 120×48px
- Background: `--coral`, text `--parchment`
- Font: `--font-pixel`, 16px, uppercase
- Hover: bg `--coral-light`, translateY -2px, shadow
- Active: scale 0.95
- Disabled (enemy turn): opacity 0.4, cursor not-allowed

**Replace Button:**
- Position: left of End Turn
- Size: 100×40px
- Background: `--shallow`, border `--panel-border`
- Text: "REPLACE" with remaining count ("REPLACE 1/1")
- Used: strikethrough text, opacity 0.4

**Deck / Discard Indicators:**
- Small stacks at bottom corners
- Deck: card back sprite stacked with offset, count label
- Discard: face-up top card (small, 60×84px), count label
- Hover deck: tooltip showing "Draw Pile: N cards"

### 4.8 Floating Text System

All floating text uses CSS `@keyframes` — no JS animation loops.

```css
@keyframes float-up {
  0% { transform: translateY(0) scale(1); opacity: 1; }
  20% { transform: translateY(-10px) scale(1.2); opacity: 1; }
  100% { transform: translateY(-60px) scale(0.8); opacity: 0; }
}

@keyframes float-crit {
  0% { transform: translateY(0) scale(1); opacity: 1; }
  15% { transform: translateY(-8px) scale(1.5); opacity: 1; }
  30% { transform: translateY(-4px) scale(1.3); opacity: 1; }
  100% { transform: translateY(-70px) scale(0.7); opacity: 0; }
}

@keyframes float-gold {
  0% { transform: translateY(0); opacity: 1; }
  50% { transform: translateY(-20px); opacity: 1; }
  100% { transform: translateY(-40px); opacity: 0; }
}
```

**Floating Text Types:**
| Type | Color | Animation | Duration |
|------|-------|-----------|----------|
| Damage | `--float-damage` | `float-up` | 1s |
| Critical | `--float-crit` | `float-crit` | 1.2s |
| Heal | `--float-heal` | `float-up` | 1s |
| Gold | `--float-gold` | `float-gold` | 1.5s |
| Mana | `--float-mana` | `float-up` | 0.8s |

**Implementation:** Svelte component `FloatingText.svelte` that mounts, plays animation, auto-removes after animationend.

---

## 5. Menu / HUD Systems

### 5.1 Main Menu Screen (redesign)

```
┌─────────────────────────────────────────────┐
│                                             │
│           🌊  [Animated wave bg]  🌊         │
│                                             │
│              ╭─────────────╮                  │
│              │  FISH DEBT  │                  │
│              │  ─────────  │                  │
│              │ TACTICAL RPG│                  │
│              ╰─────────────╯                  │
│                                             │
│              [ NEW GAME ]                     │
│              [ CONTINUE  ]  ← disabled if no save
│              [ SETTINGS  ]                    │
│              [ QUIT      ]                    │
│                                             │
│              v0.2.0 — Tactical Build         │
│                                             │
└─────────────────────────────────────────────┘
```

**Visual:**
- Background: Excalibur canvas with animated ocean waves (subtle, dark)
- Title: `--font-display`, 48px, `--gold`, text-shadow glow
- Subtitle: `--font-pixel`, 20px, `--parchment-dim`
- Menu buttons: 280×56px, centered stack with 16px gap
- Button style: `--shallow` bg, 2px border `--panel-border`, `--font-pixel` 18px
- Hover: bg `--coral`, border `--coral`, translateY -4px, shadow 0 8px 24px rgba(232,93,78,0.3)
- Transition: all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)

**Entry Animation:**
- `@keyframes menu-enter`: Title fades in + slides down (0.6s), buttons stagger in (0.1s delay each), slide up + fade

### 5.2 Pre-Battle Deck Screen

**Purpose:** Select 25-30 cards from collection for the upcoming battle.

```
┌─────────────────────────────────────────────────────────┐
│  ASSEMBLE YOUR SQUAD          28/30 cards selected       │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐           │
│  │Card 1  │ │Card 2  │ │Card 3  │ │Card 4  │  ← Collection
│  │   x2   │ │   x1   │ │   x0   │ │   x2   │     (grid)
│  └────────┘ └────────┘ └────────┘ └────────┘           │
│                                                         │
│  ─────────────────────────────────────────────────────   │
│                                                         │
│  SELECTED DECK:                                         │
│  ┌──┐┌──┐┌──┐┌──┐┌──┐┌──┐┌──┐┌──┐ ... (compact row)  │
│  └──┘└──┘└──┘└──┘└──┘└──┘└──┘└──┘                    │
│                                                         │
│              [ START BATTLE ]  [ BACK TO MAP ]          │
└─────────────────────────────────────────────────────────┘
```

**Collection Cards:**
- Compact card: 100×140px (scaled down from full card)
- Count badge: "x2" means 2 copies selected (max 2 per card)
- Click to add (if under max), click again to remove
- Selected cards have gold border, slight glow

**Validation:**
- Deck size counter: green if 25-30, red otherwise
- Start Battle button disabled until valid

### 5.3 Shop Screen (redesign)

```
┌─────────────────────────────────────────────────────────┐
│  MERCHANT OF THE DEEP                    GOLD: 💰 150    │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  CARDS FOR SALE:                                        │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐         │
│  │ Card   │ │ Card   │ │ Card   │ │ Card   │           │
│  │  50G   │ │  75G   │ │  50G   │ │ 100G   │           │
│  └────────┘ └────────┘ └────────┘ └────────┘           │
│                                                         │
│  RELICS:                                                │
│  ┌────────┐ ┌────────┐                                 │
│  │ Relic  │ │ Relic  │                                  │
│  │  150G  │ │  200G  │                                  │
│  └────────┘ └────────┘                                 │
│                                                         │
│  SERVICES:     [Remove Card: 25G]  [Heal: 20G]         │
│                                                         │
│              [ LEAVE SHOP ]                               │
└─────────────────────────────────────────────────────────┘
```

**Card Price Display:**
- Price badge: bottom-right of card, gold coin icon + number
- If unaffordable: badge turns red, strikethrough
- Purchase animation: `@keyframes buy-card`: card scales down to 0, gold sparkles (CSS particles)

### 5.4 Battle Rewards Screen

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│              🏆  VICTORY  🏆                             │
│                                                         │
│         Gold earned: 💰 45                                │
│                                                         │
│    Choose your reward:                                  │
│                                                         │
│    ┌────────┐    ┌────────┐    ┌────────┐              │
│    │ Card 1 │ or │ Card 2 │ or │ Card 3 │              │
│    │        │    │        │    │        │              │
│    └────────┘    └────────┘    └────────┘              │
│                                                         │
│    [ SKIP REWARD ]        [ CONTINUE ]                   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Animation:**
- `@keyframes victory-flare`: Screen flash gold, then fade to normal (0.5s)
- Cards slide in from bottom with stagger (0.15s each)
- Gold counter counts up with `@keyframes gold-tick` (number pop effect per increment)

### 5.5 Dialogue Box

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│  ┌────┐                                                 │
│  │🐟  │  "You owe the Deep Bank 500 scales. Pay up,    │
│  │    │   or face the Leviathan."                       │
│  └────┘                                                 │
│                                                         │
│              [ Next ▶ ]    [ Attack! ]                   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Layout:**
- Positioned bottom-center, max-width 800px
- Background: `--dialogue-bg`, border `--panel-border`, border-radius 8px
- Portrait: 80×80px pixel art, left side
- Text: `--font-body`, 16px, `--parchment`, line-height 1.5
- Name label above portrait: `--font-pixel`, 14px, `--gold`

**Typewriter Effect:**
- Text reveals character by character
- Uses CSS `clip-path` animation or Svelte tick-based reveal (allowed since it's text, not positional animation)
- `@keyframes text-cursor`: blinking cursor at end of text

**Choices:**
- Horizontal row of buttons below text
- Each button: `--shallow` bg, hover `--coral`

### 5.6 Save / Load Screen

```
┌─────────────────────────────────────────────────────────┐
│  SAVE / LOAD GAME                                       │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │ SLOT 1                                          │   │
│  │ Chapter III — The Abyssal Vault                   │   │
│  │ HP: 18/30  |  Gold: 120  |  Deck: 28 cards      │   │
│  │ [SAVE]  [LOAD]  [DELETE]                        │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │ SLOT 2  —  EMPTY                                │   │
│  │ [SAVE NEW GAME]                                 │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │ SLOT 3  —  EMPTY                                │   │
│  │ [SAVE NEW GAME]                                 │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│              [ BACK ]                                   │
└─────────────────────────────────────────────────────────┘
```

**Slot Card:**
- Background: `--deep`, border `--panel-border`
- Occupied: left border 4px `--gold`
- Empty: left border 4px `--parchment-dim`, dimmed
- Hover: translateX 4px, border color `--coral`

---

## 6. Sprite System

### 6.1 Sprite Strategy Overview

**Rendering Pipeline:**
1. All pixel art created at 1× resolution (native pixel size)
2. Rendered in Excalibur with `imageRendering: 'pixelated'`
3. Scaling: nearest-neighbor (no blur)
4. Sprite sheets: PNG with transparent background, packed with 1px padding

**File Organization:**
```
public/sprites/
  hero/
    guppy_idle.png      (32×32, 4 frames)
    guppy_walk.png      (32×32, 6 frames)
    guppy_attack.png    (32×32, 8 frames)
    guppy_damage.png    (32×32, 4 frames)
    guppy_death.png     (32×32, 6 frames)
  enemies/
    crab_idle.png       (32×32, 4 frames)
    crab_attack.png     (32×32, 6 frames)
    jelly_idle.png      (32×32, 4 frames)
    eel_idle.png        (32×32, 4 frames)
    hammerhead_idle.png (32×32, 4 frames)
    leviathan_idle.png  (64×64, 4 frames)
    tentacle_idle.png   (32×32, 4 frames)
  units/
    shrimp_minion.png   (24×24, 4 frames)
  tiles/
    tile_water.png      (64×64)
    tile_sand.png       (64×64)
    tile_stone.png      (64×64)
    tile_floor.png      (64×64)
    tile_mana_spring.png (64×64, animated: 4 frames)
  cards/
    card_back.png       (140×200)
    card_frame.png      (140×200, 9-slice border)
    art_fin_slash.png   (120×80)
    art_bubble_shield.png (120×80)
    ... (one per card)
  icons/
    intent_attack.png   (16×16)
    intent_defend.png   (16×16)
    intent_buff.png     (16×16)
    intent_debuff.png   (16×16)
    intent_special.png  (16×16)
    mana_orb.png        (16×16, 2 frames: empty/filled)
    armor_icon.png      (12×12)
    hp_icon.png         (12×12)
    coin_icon.png       (12×12)
  fx/
    fx_attack_swing.png (64×64, 6 frames)
    fx_damage_flash.png (32×32, 4 frames)
    fx_heal_glow.png    (48×48, 6 frames)
    fx_armor_shimmer.png (32×32, 4 frames)
    fx_death_fade.png   (48×48, 8 frames)
    fx_mana_spring.png  (64×64, 8 frames)
  map/
    hero_avatar.png     (32×32)
    zone_combat.png     (24×24)
    zone_elite.png      (24×24)
    zone_shop.png       (24×24)
    zone_rest.png       (24×24)
    zone_boss.png       (32×32)
    zone_start.png      (24×24)
    path_dot.png        (4×4)
```

### 6.2 Hero Sprite: Guppy

**Base Dimensions:** 32×32 pixels  
**Scale in game:** 1.5× (48×48 on screen)  
**Color Palette:**
| Part | Color | Hex (for artist reference only) |
|------|-------|--------------------------------|
| Body (main) | Warm orange | #f4a430 |
| Body (shade) | Darker orange | #c98420 |
| Suit (main) | Navy blue | #1e3a5f |
| Suit (shade) | Dark navy | #162a40 |
| Fin | Coral red | #e85d4e |
| Eye | White + black pupil | #fff / #0a1628 |
| Tie | Gold | #f4c430 |

**Animation Frames:**

| Animation | Frames | Duration | Loop | Notes |
|-----------|--------|----------|------|-------|
| Idle | 4 | 0.8s | Yes | Gentle tail wag, breathing |
| Walk | 6 | 0.6s | Yes | Hop movement, fin motion |
| Attack | 8 | 0.5s | No | Lunge forward, fin slash, recoil |
| Damage | 4 | 0.3s | No | Flash white, shake, recoil |
| Death | 6 | 1.0s | No | Spin, fade to bubbles, sink |

**Frame Layout:** Horizontal sprite sheet, frames left-to-right.

### 6.3 Enemy Sprites

**Standard Enemy:** 32×32 pixels, 1.5× scale  
**Boss Enemy:** 64×64 pixels, 1× scale (Leviathan)

**Enemy Types:**

| Enemy | Size | Palette | Idle Frames | Attack Frames |
|-------|------|---------|-------------|---------------|
| Small Crab | 32×32 | Red shell #c94a3e, blue claws #3b82f6 | 4 | 6 (pinch motion) |
| Jelly Drifter | 32×32 | Translucent pink #ff6b9d, glow center | 4 | 4 (pulse expand) |
| Puffer Fish | 32×32 | Yellow #fbbf24, spikes #e85d4e | 4 | 4 (spike extend) |
| Collector Eel | 32×32 | Dark green #15803d, gold accents | 4 | 6 (lunge) |
| Hammerhead | 32×32 | Gray #6b7280, white underbelly | 4 | 6 (headbutt) |
| Debt Leviathan | 64×64 | Deep purple #7e22ce, gold eyes | 4 | 8 (tentacle sweep) |
| Leviathan Tentacle | 32×32 | Same purple, sucker details | 4 | 6 (slam) |

### 6.4 Summon / Minion Sprites

**Shrimp Ally:** 24×24 pixels, 1.5× scale
- Palette: Pink #fda4af, small size
- Animations: Idle (4 frames), Attack (4 frames)
- Positioned on grid same as hero/enemy

### 6.5 Tile Sprites

**Base Size:** 64×64 pixels  
**Style:** Top-down perspective, subtle depth shadow on bottom edge  
**Tile Variants:** Each tile type has 4 edge variants (flat, N-wall, E-wall, corner) for map building.

| Tile | Base Color | Details |
|------|-----------|---------|
| Water | #0d2b4a | Wave lines, caustic light spots |
| Sand | #1a3a5c | Grain texture, shell debris |
| Stone | #162a40 | Cobble pattern, moss in cracks |
| Floor | #0f2236 | Wood planks, rope details |
| Mana Spring | #0d2b4a + cyan glow | Animated ripple rings, glowing center |

**Mana Spring Animation:**
- 4 frames, 0.6s loop
- Rings expand outward from center, fading
- Center glow pulses

### 6.6 Card Art Sprites

**Size:** 120×80 pixels  
**Style:** Small scene illustration, pixel art  
**One per unique card** (not per copy)

Examples:
- Fin Slash: Guppy's fin extended, motion lines
- Bubble Shield: Guppy inside large bubble
- Ink Cloud: Black cloud with red eyes
- Small Loan: Gold coin pile with IOU note

### 6.7 VFX / Animation Sprites

**Attack Swing:**
- 64×64, 6 frames
- White arc slash, fading trail
- Positioned over attacker, oriented toward target

**Damage Flash:**
- 32×32, 4 frames
- White flash covering target unit
- Then red particle burst (4 frames)

**Heal Glow:**
- 48×48, 6 frames
- Green/blue rising particles
- Positioned over healed unit

**Armor Shimmer:**
- 32×32, 4 frames
- Blue hexagonal shield overlay
- Fades in, holds, fades out

**Death Fade:**
- 48×48, 8 frames
- Unit turns gray, sinks down, bubble particles rise
- Final frame: empty

**Mana Spring Burst:**
- 64×64, 8 frames
- Cyan energy explosion when stepping on mana spring
- Expanding ring + particle spray

### 6.8 Floating Text (CSS-only)

No sprites — pure CSS text with `@keyframes` as defined in section 4.8.

Font: `--font-pixel`, bold, with text-shadow for readability:
```css
.floating-text {
  font-family: var(--font-pixel);
  font-size: 20px;
  font-weight: bold;
  text-shadow: 0 2px 4px rgba(0,0,0,0.8);
  position: absolute;
  pointer-events: none;
}
```

### 6.9 Map Sprites

**Zone Markers:** Small pixel art icons
- Combat: Crossed swords, 24×24
- Elite: Swords with star, 24×24
- Shop: Coin stack, 24×24
- Rest: Bed/anchor icon, 24×24
- Boss: Crown/skull, 32×32
- Start: Flag, 24×24

**Hero Avatar:**
- 32×32 pixel art of Guppy (simplified vs combat sprite)
- Facing right by default
- `@keyframes map-avatar-bob`: gentle float, 2s infinite

---

## 7. Animation Specifications

### 7.1 CSS @keyframes Library

All animations are CSS `@keyframes`. No JS animation loops.

```css
/* === GLOBAL ANIMATIONS === */

/* Unit / node pulse */
@keyframes pulse {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.08); opacity: 0.9; }
}

/* Active unit glow */
@keyframes active-pulse {
  0%, 100% { filter: drop-shadow(0 0 6px var(--unit-active-glow)); }
  50% { filter: drop-shadow(0 0 14px var(--unit-active-glow)); }
}

/* Intent icon bob */
@keyframes intent-bob {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-3px); }
}

/* Tile state pulse */
@keyframes tile-pulse {
  0%, 100% { opacity: 0.5; }
  50% { opacity: 0.9; }
}

/* Tile glow for selection */
@keyframes tile-glow {
  0%, 100% { box-shadow: inset 0 0 6px var(--tile-selected); }
  50% { box-shadow: inset 0 0 16px var(--tile-selected); }
}

/* Mana orb pulse */
@keyframes mana-glow {
  0%, 100% { filter: drop-shadow(0 0 2px var(--mana-fill)); }
  50% { filter: drop-shadow(0 0 6px var(--mana-fill)); }
}

/* Card hover lift */
@keyframes card-lift {
  0% { transform: translateY(0) scale(1); }
  100% { transform: translateY(-16px) scale(1.05); }
}

/* Card shuffle/replace */
@keyframes card-shuffle {
  0% { transform: translateX(0); opacity: 1; }
  25% { transform: translateX(-20px); opacity: 0.5; }
  50% { transform: translateX(20px); opacity: 0.5; }
  100% { transform: translateX(0); opacity: 1; }
}

/* Phase badge transition */
@keyframes phase-slide-in {
  0% { transform: translateX(20px); opacity: 0; }
  100% { transform: translateX(0); opacity: 1; }
}

/* Floating text: damage */
@keyframes float-up {
  0% { transform: translateY(0) scale(1); opacity: 1; }
  20% { transform: translateY(-12px) scale(1.2); opacity: 1; }
  100% { transform: translateY(-70px) scale(0.7); opacity: 0; }
}

/* Floating text: critical */
@keyframes float-crit {
  0% { transform: translateY(0) scale(1); opacity: 1; }
  10% { transform: translateY(-8px) scale(1.6); opacity: 1; }
  30% { transform: translateY(-4px) scale(1.3); opacity: 1; }
  100% { transform: translateY(-80px) scale(0.6); opacity: 0; }
}

/* Floating text: gold/mana */
@keyframes float-gold {
  0% { transform: translateY(0); opacity: 1; }
  50% { transform: translateY(-24px); opacity: 1; }
  100% { transform: translateY(-48px); opacity: 0; }
}

/* Menu entry stagger */
@keyframes menu-enter {
  0% { transform: translateY(20px); opacity: 0; }
  100% { transform: translateY(0); opacity: 1; }
}

/* Screen fade overlay */
@keyframes screen-fade-in {
  0% { opacity: 0; }
  100% { opacity: 1; }
}

/* Victory flare */
@keyframes victory-flare {
  0% { background: rgba(244, 196, 48, 0.6); }
  50% { background: rgba(244, 196, 48, 0.2); }
  100% { background: transparent; }
}

/* Gold counter tick */
@keyframes gold-tick {
  0% { transform: scale(1); }
  50% { transform: scale(1.3); }
  100% { transform: scale(1); }
}

/* Map path marching ants */
@keyframes path-flow {
  0% { stroke-dashoffset: 0; }
  100% { stroke-dashoffset: -20; }
}

/* Hero avatar bob on map */
@keyframes hero-bob {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-4px); }
}

/* Typewriter cursor */
@keyframes text-cursor {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}

/* Button press feedback */
@keyframes button-press {
  0% { transform: scale(1); }
  50% { transform: scale(0.92); }
  100% { transform: scale(1); }
}

/* Card draw animation (from deck to hand) */
@keyframes card-draw {
  0% { transform: translate(-200px, 100px) scale(0.5) rotate(-10deg); opacity: 0; }
  60% { transform: translate(0, -20px) scale(1.1) rotate(2deg); opacity: 1; }
  100% { transform: translate(0, 0) scale(1) rotate(0); opacity: 1; }
}

/* Screen shake (on heavy damage) */
@keyframes screen-shake {
  0%, 100% { transform: translate(0, 0); }
  10% { transform: translate(-4px, 2px); }
  20% { transform: translate(4px, -2px); }
  30% { transform: translate(-3px, -1px); }
  40% { transform: translate(3px, 1px); }
  50% { transform: translate(-2px, 2px); }
  60% { transform: translate(2px, -2px); }
  70% { transform: translate(-1px, 1px); }
  80% { transform: translate(1px, -1px); }
  90% { transform: translate(0, 0); }
}
```

### 7.2 prefers-reduced-motion

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
  
  /* Keep essential state changes instant */
  .tile-move-range,
  .tile-attack-range,
  .tile-valid-target {
    opacity: 0.8;
  }
  
  .unit-active {
    filter: drop-shadow(0 0 4px var(--unit-active-glow));
  }
}
```

---

## 8. Component Inventory

### 8.1 New Svelte Components

| Component | File | Purpose |
|-----------|------|---------|
| `CombatGrid` | `ui/tactical/CombatGrid.svelte` | 9×5 grid overlay (tile states, unit positions) |
| `GridTile` | `ui/tactical/GridTile.svelte` | Individual tile with state styling |
| `UnitSprite` | `ui/tactical/UnitSprite.svelte` | Unit on grid with HP bar, intent, armor |
| `TacticalHand` | `ui/tactical/TacticalHand.svelte` | Hand of cards with play/replace logic |
| `TacticalCard` | `ui/tactical/TacticalCard.svelte` | Individual card component |
| `ManaBar` | `ui/tactical/ManaBar.svelte` | Mana crystal orbs |
| `TurnBar` | `ui/tactical/TurnBar.svelte` | Turn counter + phase badge |
| `FloatingText` | `ui/tactical/FloatingText.svelte` | Damage/heal/gold numbers |
| `IntentIcon` | `ui/tactical/IntentIcon.svelte` | Enemy intent display |
| `OverworldMap` | `ui/overworld/OverworldMap.svelte` | Redesigned map with nodes, paths, avatar |
| `MapNode` | `ui/overworld/MapNode.svelte` | Interactive zone marker |
| `MapPath` | `ui/overworld/MapPath.svelte` | SVG connection lines |
| `HeroAvatar` | `ui/overworld/HeroAvatar.svelte` | Map hero sprite with movement |
| `OverworldHUD` | `ui/overworld/OverworldHUD.svelte` | Bottom bar with stats, deck, settings |
| `DeckSelectScreen` | `ui/screens/DeckSelectScreen.svelte` | Pre-battle deck assembly |
| `RewardScreen` | `ui/screens/RewardScreen.svelte` | Post-battle card/gold rewards |
| `DialogueBox` | `ui/screens/DialogueBox.svelte` | Character dialogue with portraits |
| `SaveLoadScreen` | `ui/screens/SaveLoadScreen.svelte` | 3-slot save/load |
| `SettingsScreen` | `ui/screens/SettingsScreen.svelte` | Audio, graphics, accessibility |
| `CardArt` | `ui/shared/CardArt.svelte` | Card art display with frame |
| `CardBack` | `ui/shared/CardBack.svelte` | Deck/discard pile back sprite |
| `PixelButton` | `ui/shared/PixelButton.svelte` | Reusable pixel-styled button |
| `StatBadge` | `ui/shared/StatBadge.svelte` | ATK/DEF/HP small badge |

### 8.2 Modified Existing Components

| Component | Changes |
|-----------|---------|
| `MainMenu.svelte` | New title, subtitle, animated background, button styling |
| `MapOverlay.svelte` | Complete redesign per section 3 |
| `BattleHUD.svelte` | Replace with tactical grid layout per section 4 |
| `ShopPanel.svelte` | Card grid layout, price badges, purchase animation |
| `HandZone.svelte` | Replace with `TacticalHand` |
| `ActionBarZone.svelte` | Add Replace button, reposition |
| `TurnInfoZone.svelte` | Add phase badge colors, mana bar |
| `app.css` | Add all new CSS variables from section 2 |

### 8.3 Excalibur Scene Updates

| Scene | Updates |
|-------|---------|
| `MapScene.ts` | Animated ocean background, bubble particles |
| `BattleScene.ts` | Grid rendering, tilemap, unit sprite placement |
| `MenuScene.ts` | Animated wave background |

---

## 9. Responsive Behavior

### 9.1 Breakpoints

| Breakpoint | Width | Grid Tile | Hand Cards | Layout Changes |
|------------|-------|-----------|------------|----------------|
| Desktop | >1024px | 64×64 | 5 fanned | Full layout |
| Tablet | 768-1024px | 48×48 | 5 compact | Side panels collapse |
| Mobile | <768px | 40×40 | 3+2 or scroll | Minimal HUD, stacked |

### 9.2 Mobile Adaptations

- Grid: centered, scrollable if needed
- Hand: horizontal scroll with snap points
- Top bar: collapses to icons with tap-to-expand
- Unit HP bars: always visible, larger touch targets
- Buttons: minimum 44×44px touch target
- Floating text: larger font (24px)

---

## 10. Accessibility

### 10.1 Color Contrast
- All text on dark backgrounds uses `--parchment` (#e8dcc5) on `--deep` (#0f2236) = 8.2:1 ratio
- Interactive elements have minimum 3:1 contrast against adjacent colors
- HP bar colors: green on dark = 4.5:1, red on dark = 5.1:1

### 10.2 Motion
- `prefers-reduced-motion` respected globally (section 7.2)
- Essential feedback (damage flash) preserved but instant
- Tile state indicators use opacity + border, not just animation

### 10.3 Focus States
- All buttons: 2px outline `--gold`, offset 2px
- Cards: border `--gold`, shadow glow
- Map nodes: ring outline `--parchment`

### 10.4 Screen Reader
- Grid tiles: `aria-label="Tile X,Y: [state]"`
- Units: `aria-label="[Name]: [HP]/[MaxHP] HP, [intent]"`
- Cards: `aria-label="[Name]: costs [mana], [description]"`
- Phase changes: `aria-live="polite"` announcement

---

## 11. Implementation Order

### Phase 1: Foundation
1. Update `app.css` with new CSS variables
2. Add Google Fonts to `index.html`
3. Create `PixelButton` shared component
4. Update `MainMenu.svelte` with new design

### Phase 2: Overworld
1. Redesign `MapOverlay.svelte`
2. Create `MapNode`, `MapPath`, `HeroAvatar` components
3. Create `OverworldHUD` component
4. Update `MapScene.ts` with animated background

### Phase 3: Tactical Grid
1. Create `CombatGrid` and `GridTile` components
2. Create `UnitSprite` with HP bar, intent, armor
3. Create `ManaBar`, `TurnBar`, `IntentIcon`
4. Update `BattleScene.ts` for grid rendering

### Phase 4: Hand & Actions
1. Create `TacticalCard` and `TacticalHand`
2. Create `FloatingText` system
3. Update `BattleHUD.svelte` with new layout
4. Add Replace button to action bar

### Phase 5: Screens
1. Create `DeckSelectScreen`
2. Create `RewardScreen`
3. Create `DialogueBox`
4. Create `SaveLoadScreen`
5. Redesign `ShopPanel`

### Phase 6: Polish
1. Add all CSS animations
2. Implement `prefers-reduced-motion`
3. Add screen reader labels
4. Responsive testing

---

## 12. Asset Checklist

### 12.1 Priority 1 (Required for MVP)

**Hero:**
- [ ] `guppy_idle.png` (32×32, 4 frames)
- [ ] `guppy_attack.png` (32×32, 8 frames)
- [ ] `guppy_damage.png` (32×32, 4 frames)

**Enemies (minimum 3):**
- [ ] `crab_idle.png` (32×32, 4 frames)
- [ ] `jelly_idle.png` (32×32, 4 frames)
- [ ] `eel_idle.png` (32×32, 4 frames)

**Tiles:**
- [ ] `tile_water.png` (64×64)
- [ ] `tile_floor.png` (64×64)
- [ ] `tile_mana_spring.png` (64×64, 4 frames)

**Cards:**
- [ ] `card_back.png` (140×200)
- [ ] `card_frame.png` (140×200, 9-slice)
- [ ] `art_fin_slash.png` (120×80)
- [ ] `art_bubble_shield.png` (120×80)
- [ ] `art_ink_cloud.png` (120×80)

**Icons:**
- [ ] `intent_attack.png` (16×16)
- [ ] `intent_defend.png` (16×16)
- [ ] `mana_orb.png` (16×16, 2 frames)
- [ ] `armor_icon.png` (12×12)

**Map:**
- [ ] `hero_avatar.png` (32×32)
- [ ] `zone_combat.png` (24×24)
- [ ] `zone_shop.png` (24×24)
- [ ] `zone_boss.png` (32×32)

**FX:**
- [ ] `fx_attack_swing.png` (64×64, 6 frames)
- [ ] `fx_damage_flash.png` (32×32, 4 frames)

### 12.2 Priority 2 (Polish)

- [ ] All remaining enemy animations (walk, attack, death)
- [ ] All card art (one per unique card)
- [ ] All tile variants (sand, stone, edge pieces)
- [ ] Remaining FX (heal, armor, death, mana spring)
- [ ] Map zone markers (all types)
- [ ] Hero walk/death animations
- [ ] Minion sprites

---

## Appendix A: Color Quick Reference

| Purpose | Variable | Value |
|---------|----------|-------|
| Deepest background | `--abyss` | #0a1628 |
| Panel background | `--bg-panel` | rgba(15,34,54,0.9) |
| Primary text | `--parchment` | #e8dcc5 |
| Dim text | `--parchment-dim` | #a89880 |
| Accent / primary action | `--coral` | #e85d4e |
| Gold / reward | `--gold` | #f4c430 |
| HP / danger | `--hp-bar` | #ef4444 |
| Mana / blue | `--unit-blue` | #3b82f6 |
| Defense / green | `--stat-def` | #22c55e |
| Enemy / purple | `--hp-enemy` | #a855f7 |
| Grid move range | `--tile-move-range` | rgba(59,130,246,0.3) |
| Grid attack range | `--tile-attack-range` | rgba(232,93,78,0.35) |
| Grid valid target | `--tile-valid-target` | rgba(34,197,94,0.3) |
| Unit active glow | `--unit-active-glow` | rgba(244,196,48,0.6) |
| Floating damage | `--float-damage` | #ef4444 |
| Floating heal | `--float-heal` | #22c55e |
| Floating gold | `--float-gold` | #f4c430 |

---

*End of Design Document*
