---
title: Angular-style file system convention applied (Aug 2026)
type: memory
tags: [convention, file-organization, barrel, architecture]
status: active
---

Angular-style file system is now the JS engine convention (spec wiki:specs:angular-style-file-system, approved 2026-08-03): one top-level type per file, role suffixes (*.service.ts, *.interface.ts, *.model.ts, *.enum.ts, *.helper.ts, *.constants.ts), domain folders each with index.ts barrel, consumers import from domain barrels only. Applied to src/lib/game/ (cards/, units/, battle/, services/, helpers/, root index.ts barrel re-exports all + data.ts). Discriminated unions (CardEffect) stay together as one unit per file. src/lib/utils.ts cn() stays put (shadcn alias). Components one-per-file in src/components/game/. Type-only cycle fish-mafia-app↔fish-mafia-game remains (erased at compile). Value cycle engine.service↔effects.service pre-existing, preserved. CONVENTIONS/ARCHITECTURE wiki pages rewritten to real Next.js 16 + React 19 + Tailwind v4 stack (2026-08-03) — they previously described the retired Godot/Rust pivot; do not reintroduce that stack text.