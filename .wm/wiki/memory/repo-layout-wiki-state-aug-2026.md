---
title: Repo layout + wiki state (Aug 2026)
type: memory
status: active
tags: [layout, wiki, architecture, build]
---

Fish Mafia: Ledger Tactics (Next.js 16 + React 19, Tailwind v4) lives in src/ (src-dir layout): src/app, src/components, src/hooks, src/lib/game; public/ at repo root serves /sprites/{kind}.png. tsconfig @/* alias maps to ./ (src/). Build: `npm run build` from src/. Engine is pure React-free in src/lib/game, now restructured (Aug 2026) into Angular-style domain folders + barrels: cards/, units/, battle/, services/ (*.service.ts), helpers/ (icons.helper.ts), root index.ts barrel; one type per file with role suffixes (see wiki:specs:angular-style-file-system). Engine data: CARD_LIBRARY, STARTER_DECK ids, ENEMY_SPAWNS, BUY_COST=3, sell = value + floor(interest/4). Wiki core pages updated Aug 2026: CONVENTIONS + ARCHITECTURE rewritten to the real JS stack (retired Godot/Rust pivot text removed); DESIGN.md component map fixed to real src/ topology (was pre-src-dir drift). F-1 deck economy PARTIAL (in-combat buy/sell), F-2..F-5 PLANNED.