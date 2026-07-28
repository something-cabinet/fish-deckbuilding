---
title: Browser Game Persistence: localStorage
type: memory
tags: [decision, persistence, architecture]
status: active
---

For single-player browser games, use localStorage for save/load — NOT Prisma/SQLite. Prisma imports Node native modules that can't compile in a Vite browser bundle. localStorage is synchronous, always available, and sufficient for game state (<100KB). Full reference: @wiki/decisions/browser-localstorage-persistence