---
{}
relates_to:
  - {type: references, target: wiki:specs:fish-tactical-rpg}
---

---
title: Decision: Browser localStorage over Prisma/SQLite for Game Persistence
type: decision
id: wiki:decisions:browser-localstorage-persistence
tags: [decision, persistence, database, prisma, sqlite, localstorage]
---

## Context
The game needed persistence for card definitions, card collection, campaign state, and save/load across sessions. Initially Prisma ORM with SQLite was chosen — a standard choice for Node.js applications.

## Decision
**Use browser localStorage** instead of Prisma/SQLite for all client-side game persistence. Delete the Prisma + better-sqlite3 dependency from the game bundle.

Not chosen: Prisma + SQLite with @prisma/adapter-better-sqlite3. This imported Node native modules that cannot compile or run in a Vite browser bundle. The build only passed because tree-shaking dropped the unreferenced module.

## Rationale
- **Browser incompatibility**: Prisma + better-sqlite3 requires Node native modules (`fs`, `path`, `crypto`, SQLite C bindings). Vite cannot bundle these for browser execution. The Prisma client is fundamentally a server-side ORM.
- **Simpler solution exists**: localStorage is synchronous, available in every browser, and sufficient for single-player game state (typically <100KB per save). No build tooling, no migrations, no adapters.
- **Faster iteration**: With localStorage, save/load is `JSON.parse/stringify` — no schema migrations, no seed scripts, no Prisma client generation. Changes to save data format are free.
- **Offline-first**: localStorage works without any server infrastructure. The game is fully playable offline.

## Consequences
- **Positive**: Zero build dependencies for persistence. The Vite bundle stays lean.
- **Positive**: Save/load is synchronous and instant. No async/await needed.
- **Positive**: No schema migrations needed — adapt save format freely during development.
- **Positive**: Full offline play without server setup.
- **Negative**: Limited to ~5-10MB per origin (far more than needed for game state).
- **Negative**: Not suitable for multiplayer (would need server-side DB).
- **Negative**: Cannot query save data (no SQL, no Prisma client) — but game persistence only needs full-save/load by slot.

## Related
- @wiki/specs/fish-tactical-rpg