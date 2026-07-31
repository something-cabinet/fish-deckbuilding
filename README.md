# Fish Tactical RPG — JS App

Investigation branch: **grid-tactics card game in pure TypeScript + Svelte 5 + PixiJS** (JS is the real platform going forward).

This branch replaces the retired Godot 4 + godot-rust stack (see `main` for that implementation) with a JS architecture:

```
                  +--------------------------+
                  |    Pure TypeScript Engine|
                  |  (Board state, Mana, Hand|
                  |   Rules, Card Effects)   |
                  +-------------+------------+
                                |
             +------------------+------------------+
             |                                     |
             v                                     v
  +----------------------+               +--------------------+
  |  Svelte 5 UI Layer   |               |  PixiJS Canvas     |
  |  - Hand UI Cards     |               |  - Grid Map        |
  |  - End Turn Button   |               |  - Unit Sprites    |
  |  - Stat Hover Card   |               |  - Tile Highlights |
  +----------------------+               +--------------------+
```

## Rules

- Engine is a pure TS module with **zero framework dependencies** — both Svelte and PixiJS read from it as a single source of truth.
- Cards output `GameAction` objects (`{ type: 'DAMAGE_TILE', target, value }`) resolved by an `ActionResolver` — no raw code per card.
- Drag-to-board: HTML card drag → shared `activeCard` state → PixiJS pointer raycast to grid cell → engine validates target → engine executes.
- Svelte UI wrapper uses `pointer-events: none` except interactive elements, so clicks pass through to the canvas.
- Placeholder art from https://kenney.nl/assets (CC0) — no custom art during prototyping.

## Quick Start

```bash
cd app
npm install
npm run dev      # dev server (Vite)
npm test         # Vitest — pure engine unit + integration tests
npm run build    # tsc + vite build
```

## Status

Repo cleaned for JS (rust/, godot/, docs/ removed on this branch), PRODUCT.md written. `app/` scaffolding next: engine contract + implementation, PixiJS renderer, Svelte UI.
