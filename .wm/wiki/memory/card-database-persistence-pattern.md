---
title: Card Database Persistence pattern
type: memory
tags: [cards, persistence, api, dev-tool]
status: active
---

Card Database Persistence: Custom cards are saved to `src/lib/game/cards/card-database.json` via `POST /api/cards` (Next.js API route, dev-only). The file is imported at module load into `CARD_LIBRARY` alongside the existing static packs. The API upserts by card id, auto-creates the file on first write, and returns 404 in production. The card creator's Save button posts to the API in the background while keeping local React state for instant UI feedback.