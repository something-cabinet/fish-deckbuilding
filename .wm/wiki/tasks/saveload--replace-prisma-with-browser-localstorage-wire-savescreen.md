---
title: Save/Load — replace Prisma with browser-localStorage, wire SaveScreen
type: task
id: wiki:tasks:saveload--replace-prisma-with-browser-localstorage-wire-savescreen
status: todo
priority: high
tags: [p0, persistence, save]
---

P0 — Save/load is mock data. SaveScreen writes to component-local $state (gone on refresh). LoadSlot shows a toast and navigates without loading. persistence.ts is imported by nothing. Worse, src/lib/db.ts imports @prisma/client + better-sqlite3 (Node modules) into a browser Vite bundle — can never work client-side.

Fix:
1. Delete Prisma client import from the game bundle (keep for tooling if desired)
2. Make persistence.ts's localStorage path the only path
3. Wire SaveScreen to persistence.ts
4. Load save on MainMenu "Continue"

ACs: AC-15, FR-15, NFR-3