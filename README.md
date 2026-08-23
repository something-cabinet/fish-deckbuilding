# Fish Mafia: Ledger Tactics — Web App

Investigation branch: **grid-tactics card game in Next.js + React + TypeScript + Tailwind CSS v4** (JS is the real platform).

This repo uses a pure JS/TS architecture — the retired Godot 4 + godot-rust stack lives on the `main` branch:

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

## Card Artwork

- Drop a PNG in `public/card-art/`; it shows up in the card editor's art picker with no code change.
- **Ratio 16:10 landscape**, authored at **640x400**, under ~60 KB.
- Point a card at it with `art: "<file base name>"` on its `CardDef` (e.g. `art: "generic-attack"`).
- Cards with no `art` use the generic art for their type (`generic-attack` / `generic-skill` / `generic-summon`); if the file is missing entirely they fall back to their `lucide-react` icon.
- Art is full-bleed (`object-cover`) in the card's art panel. Keep the focal subject centred and clear of the **top 25%** - the cost pill and type badge overlay both top corners.

## Quick Start

```bash
npm install
npm run dev       # dev server (Next.js)
npm run build     # tsc + next build
npm run lint      # ESLint
npm test          # unit + render tests (vitest)
npm run test:e2e  # CodeceptJS e2e against the dev server (headed)
npm run test:e2e:headless  # CodeceptJS e2e (headless, for CI)
```

E2E note: `npm run test:e2e` assumes a dev server running at `http://localhost:3000` (start `npm run dev` first). Render tests (`npm test`) use a per-file jsdom environment; engine tests stay on node.

## Status

Active JS development. `src/app/` scaffolding: engine contract + implementation, React UI, card library, card creator.
