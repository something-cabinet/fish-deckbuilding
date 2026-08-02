---
title: Repo layout + wiki state (Aug 2026)
type: memory
tags: [layout, wiki, architecture, build]
status: active
---

Fish Mafia: Ledger Tactics (Next.js 16 + React 19, Tailwind v4) lives in src/ (src-dir layout): src/app, src/components, src/hooks, src/lib/game; public/ at repo root serves /sprites/{kind}.png. tsconfig @/* alias maps to ./ (src/). Build: `npm run build` from src/. Engine is pure React-free in src/lib/game (CARD_LIBRARY, STARTER_DECK ids, ENEMY_SPAWNS, BUY_COST=3, sell = value + floor(interest/4)). Wiki core pages (.wm/wiki/core/agent.md + spec.md) updated and cross-linked Aug 2026; F-1 deck economy is PARTIAL (in-combat buy/sell), F-2..F-5 PLANNED. Note: oracle subagent returned session errors 3x in this session (transient env issue, review done inline). DESIGN.md component-map paths are pre-src-dir (app/ vs src/app/) — doc drift only.