# Fish Mafia: Ledger Tactics — Design Doc

## Visual Direction
Underwater crime-noir. A deep-ocean battlefield lit from above, with a gold-leaf "ledger" HUD framing the action. Restrained, premium, and readable — the mood is a smoky back-room deal at the bottom of the sea.

## Color System
Forced dark theme (`color-scheme: dark`). Tokens live in `app/globals.css`.

| Token | Role | Approx |
|-------|------|--------|
| `--background` | Deep ocean base | very dark desaturated navy |
| `--foreground` | Primary text | near-white cool grey |
| `--primary` / `--gold` | Brand / player accent | warm gold-amber |
| `--accent` / `--teal` | Secondary highlight | cyan-teal |
| `--enemy` | Enemy faction | crimson red |
| `--grid-line` | Board tile edges | translucent cyan |

- **3–5 core hues:** navy base + cool-grey neutrals, gold primary, teal accent, crimson enemy.
- No purple/violet. No gradients on primary elements — only two subtle radial background washes on `<body>` for ocean depth.
- Player = gold; Enemy = crimson. This mapping is consistent across tokens, health bars, roster, and target rings.

## Typography
Two families only:
- **Oswald** (`--font-display`) — condensed uppercase for headers, HUD labels, card names, stats.
- **Inter** (`--font-sans`) — body copy, card descriptions, log text.

Body uses relaxed line-height; titles use `text-balance`/`text-pretty`.

## Layout
Mobile-first, flexbox-driven, three horizontal bands:
1. **Top bar** — hero name/turn, Coin, Interest, Foreclosure meter.
2. **Main stage** — the board grid (left/center) + side panel (roster "On The Table" + "Bulletin" log).
3. **Bottom bar** — Mana ring, Draw/Spent piles, the card hand, End Turn.

Grid is `9 × 5` tiles rendered with CSS grid; units are absolutely positioned tokens layered above tiles. Everything else uses flexbox and `gap` utilities (no `space-*`, no margin+gap mixing).

## Units as Tokens
Fish are AI-generated painterly portraits presented as **circular tokens**:
- `object-cover` inside a `rounded-full` disc with a faction-colored `ring` (gold/crimson) and an inner vignette so they read as physical chips.
- Idle animation: player fish `animate-fm-bob`, enemies `animate-fm-float`.
- Selected units get a brighter gold ring; damaged units flash `animate-fm-shake`.
- ATK/HP plates and a health bar sit beneath each token.

## Motion & Particles
- **Canvas particle engine** (`components/game/particle-canvas.tsx`) draws per-effect bursts keyed by each card's `fx` id (`letter`, `phone`, `gavel`, `coin`, `draw`, `heal`, `shock`, `summon`) plus `melee`, `move`, `death`.
- **Floating combat numbers** rise off targets on hit (`animate-fm-rise`).
- Keyframes defined as utilities in `globals.css`: `fm-float`, `fm-bob`, `fm-pulse-ring`, `fm-shake`, `fm-rise`, `fm-fade-in`.

## Cards
Parchment-style card faces (light card surface against the dark stage) with:
- Cost pill (top-left), sell value (top-right), colored type tag (Attack/Skill/Summon), lucide icon art, name, description, and a Sell affordance.
- Interactions: **drag-and-drop** onto a target, or **tap-to-arm** (card lifts with a gold ring + "pick a target" banner) then tap the target. Unplayable cards are desaturated and not-allowed.

## Accessibility
- Semantic landmarks (`header`, `main`), ARIA labels on interactive controls, `sr-only` helper text.
- Decorative sprites use empty `alt`.
- Color is never the sole signal — health bars, numeric plates, and text log reinforce state.

## Component Map
- `app/page.tsx` → `components/game/fish-mafia-game.tsx` (orchestrator; drag/tap, hand, bottom bar)
- `components/game/board.tsx` — grid, tiles, reachable/target highlights
- `components/game/unit-token.tsx` — token disc, stats, health
- `components/game/card.tsx` — card face + interactions
- `components/game/top-bar.tsx` — HUD top band
- `components/game/side-panel.tsx` — roster + bulletin log
- `components/game/result-overlay.tsx` — win/lose screen
- `components/game/particle-canvas.tsx` — effects layer
- `hooks/use-fish-mafia.ts` — React state + enemy-turn orchestration
- `lib/game/{types,data,engine}.ts` — pure game model, content, and rules

## Hydration Note
`createInitialState()` is fully deterministic (no `Math.random` during render). Shuffling + the opening draw happen client-side via `startGame()` in a mount `useEffect`, avoiding SSR/client hydration mismatches.
