---
name: Fish Tactical RPG — VU-Meter Desk
description: The battle is the debt department's broadcast console — ivory meter faces, black scale arcs, ballistic needles, walnut-and-steel desk frame; the arc past zero is the only red.
colors:
  ink: "#171914"
  ink-soft: "#3d4037"
  ivory-0: "#e8e0cf"
  ivory-1: "#d9cfbb"
  ivory-2: "#a89d84"
  walnut: "#332016"
  walnut-deep: "#1d120d"
  walnut-light: "#65402a"
  steel: "#626660"
  steel-light: "#a8aaa0"
  brass: "#b38b47"
  brass-light: "#dfc27a"
  amber: "#d69b36"
  move: "#2f8785"
  move-light: "#9ed8ce"
  signal-red: "#b33b2e"
  signal-red-light: "#f0a394"
typography:
  display:
    fontFamily: "Rockwell, 'Roboto Slab', 'Courier New', serif"
    fontSize: "clamp(18px, 2.1vw, 29px)"
    letterSpacing: "0.07em"
  body:
    fontFamily: "'IBM Plex Mono', 'Cascadia Mono', 'SFMono-Regular', Consolas, monospace"
    fontSize: "10px"
  label:
    fontFamily: "'IBM Plex Mono', 'Cascadia Mono', 'SFMono-Regular', Consolas, monospace"
    fontSize: "8px"
    letterSpacing: "0.13em"
rounded:
  sm: "3px"
  md: "5px"
  pill: "50px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "14px"
  lg: "24px"
components:
  transport-armed:
    backgroundColor: "{colors.amber}"
    textColor: "{colors.ivory-0}"
    rounded: "{rounded.sm}"
  transport-idle:
    backgroundColor: "#4b211c"
    textColor: "#d9c6a9"
    rounded: "{rounded.sm}"
  channel-card:
    backgroundColor: "{colors.ivory-0}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
  panel:
    backgroundColor: "{colors.ivory-1}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
---

# Fish Tactical RPG — VU-Meter Desk

## Overview

The battle is the debt department's broadcast console in the underwater city. The player is an operator metering Guppy's debt; every consequence of play is carried by ballistic needles, never floating text. Warm ivory meter faces behind glass, black scale arcs and ballistic needles as working ink, walnut-and-steel desk frame — and **the arc past zero is the ONLY red**, reserved for damage, debt, and defeat.

Mode: **Experience** — the player is inside the instrument; the interface recedes behind the desk.

## Colors

- **Ivory faces** (`ivory-0/1/2`) — instrument faces, card fronts, meter bodies. The desk's light source.
- **Walnut** (`walnut`, `walnut-deep`, `walnut-light`) — desk surface and frame; deep browns carry the room.
- **Steel** (`steel`, `steel-light`) — frames, borders, hardware; neutral structure.
- **Brass / amber** (`brass`, `brass-light`, `amber`) — focus, armed states, pull/attack affordances, the master channel's trim.
- **Move-valid green-blue** (`move`, `move-light`) — circular sockets and chevrons for valid movement.
- **Signal red** (`signal-red`, `signal-red-light`) — the only red in the system. Damage, debt stacks, negative coin zone, defeat, foreclosure, invalid drops.
- **Ink** (`ink`, `ink-soft`) — text and scale marks on ivory.

## Typography

- **Display** — Rockwell-derived slab: titles ("GUPPY THE DEBTOR", "ACCOUNT SETTLED", "FORECLOSURE"). Instrument character, letter-spaced.
- **Body / labels** — IBM Plex Mono workhorse: meter numerals, card effects, log lines, HUD copy, keyboard hints. 8–12px, generous tracking on labels.
- Copy is institutional desk language: "Insufficient current", "Open channel required", "Range: adjacent", "Interest due — Guppy pays N", "Boss holds ground".

## Layout

- Fixed desktop viewport (100dvh, no scroll), `pointer-events: none` on the desk wrapper with `auto` only on interactive elements (hand cards, transport, panels, and the Pixi canvas itself).
- **Patch field** — 9×5 ivory board centered on walnut; the only world space.
- **Coin meter** — vertical ballistic needle left edge; +9 top, −5 credit zone below baseline (red).
- **Hand** — channel-strip rack centered bottom; cards overlap when full, lift on hover.
- **Transport** — bottom-right keycap; armed amber, red lamp idle.
- **Interest gauge** — clock + counter upper-right; foreclosure state at turn 15.
- Log panel left; deck/discard/sell pile registers; hint strip above the hand.

## Elevation & Depth

- `shadow-lift` — soft 12px ambient drop for floating controls and end-state.
- `shadow-inset` — inner bevel (top highlight, bottom shade) for recessed meter wells and frames.
- `needle-spring` cubic-bezier — the ballistic needle/HP-bar transition; overshoot comes from the engine-side BallisticNeedle integrator (view state), stepped under `prefers-reduced-motion`.
- Lamp flicker + scanline overlays are material life, both disabled under reduced motion.

## Shapes

- Sm rounding (3px) on cards, buttons, meter strips; 5px on panels.
- Circular tokens for units (fish-eye dot), circular sockets for move-valid, split-rings for attack-valid, jack points for active card targets — geometry carries meaning independent of color (color-blind safe).

## Components

- **Channel card** — ivory front, flared cost numeral top-left, pitch dot (red/yellow/blue = coin value 1/2/3), name on the strip, effect as scale arc. Playable sits proud; unplayable dims; active gets an amber outline; sell button brass with coin value.
- **Transport** — keycap button, punch-down on press, Space-kbd hint.
- **End state** — desk lamp overlay: green master lamp "ACCOUNT SETTLED" on victory, red "FORECLOSURE" on defeat, Restart button.
- **Unit strip** — two state lamps (move green-blue, attack amber), name, exact HP/ATK readout, thin HP bar, red Debt badge only when stacks exist.
- **Hover panel** — pinned inspection card (unit stats or card effect), no pointer events, fades after brief pin.

## Do's and Don'ts

- **Do** carry consequence in the needles: HP loss, coin debt, interest — ballistic motion, never floating damage numbers.
- **Do** keep red exclusive: only immediate cost, damage, debt, and failure. Move-valid is green-blue; attack-valid is brass/amber; the negative coin zone is red.
- **Do** render hand, log, meter numerals, and inspection in the Svelte layer; keep the board, units, needles, and highlights in PixiJS.
- **Don't** use fantasy chrome — no crystals, scrolls, orbs, glossy card art, or floating combat text.
- **Don't** hardcode colors in scenes: all Control styling references the theme tokens above (single source in `app/src/app.css`).
- **Don't** add motion that ignores `prefers-reduced-motion` — needles step, particles suppress, scanlines and flicker stop.

## Surface briefs

- Combat surface (approved): `.slim/deepwork/js-combat-slice.md` + `wiki:specs/js-combat-vertical-slice` (approved spec).
