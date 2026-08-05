---
title: Create POST /api/cards route with upsert
type: task
id: wiki:tasks:create-post-apicards-route-with-upsert
status: done
priority: high
tags: [from-spec, spec:card-database-persistence]
spec: wiki:specs:card-database-persistence
acceptance_criteria:
  - text: "AC-1: POST to /api/cards with a CardDef persists it to card-database.json"
  - text: "AC-2: POST with an existing id updates the entry (no duplicates)"
  - text: "AC-5: Route returns 404 in production build"
  - text: "AC-8: File is auto-created on first write if missing"
---

Create src/app/api/cards/route.ts that accepts a CardDef, upserts by id into src/lib/game/cards/card-database.json, and creates the file if missing. Dev-only — excluded from production build.