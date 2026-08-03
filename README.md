# Fish Mafia: Ledger Tactics — Web App

Investigation branch: **grid-tactics card game in Next.js + React + TypeScript + Tailwind CSS v4** (JS is the real platform going forward).

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
   +----------------------+               +----------------------+
   |  Next.js 16 App      |               |  React 19 + Tailwind |
   |  - App Router (src/) |               |  - CSS Grid Board    |
   |  - Layout, Metadata  |               |  - Unit Tokens       |
   |  - Vercel Analytics  |               |  - Card Drag & Tap   |
   +----------------------+               +----------------------+
```

## Rules

- Engine is a pure TS module with **zero framework dependencies** both the React UI and any future canvas renderer can read from it as a single source of truth.
- Cards output `GameAction` objects (`{ type: 'DAMAGE_TILE', target, value }`) resolved by an `ActionResolver` — no raw code per card.
- Drag-to-board: HTML card drag → shared state → engine validates target → engine executes.
- shadcn/ui base components, `lucide-react` icons, `tw-animate-css` for animations.
- Placeholder portraits from DiceBear (SVG avatar API) — no custom art during prototyping.

## Quick Start

```bash
npm install
npm run dev       # dev server (Next.js)
npm run build     # tsc + next build
npm run lint      # ESLint
```

## Status

Repo cleaned for JS (rust/, godot/, docs/ removed on this branch). `src/app/` scaffolding: engine contract + implementation, React UI, card library, card creator.
