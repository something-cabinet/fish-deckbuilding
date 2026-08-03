---
title: Restructure engine layer into domain folders + barrels (one type/service/helper per file)
type: task
tags:
- from-spec
- spec:angular-style-file-system
status: done
priority: high
acceptance_criteria:
- text: 'AC-1: src/lib/game/types.ts no longer exists; every top-level type lives in its own suffixed file within a domain folder'
  checked: true
- text: 'AC-2: Domain folders each have an index.ts barrel; no code outside the domain imports an individual file inside it'
  checked: true
- text: 'AC-3: engine.ts, commands.ts, effects.ts, history.ts split into per-domain *.service.ts files with no mixed responsibilities'
  checked: true
- text: 'AC-4: icons.ts and schema glue conform to *.helper.ts / barrel convention; src/lib/utils.ts stays as single-purpose cn() helper (shadcn alias constraint)'
  checked: true
- text: 'AC-5: npm test passes (baseline 57 tests, parity — no tests removed or weakened)'
  checked: true
- text: 'AC-6: npm run build passes'
  checked: true
- text: 'AC-7: No new circular imports introduced (grep-verifiable; existing type-only fish-mafia-app ↔ fish-mafia-game cycle documented if it remains)'
  checked: true
relates_to:
- type: implements
  target: wiki:specs:angular-style-file-system
---

Restructure the engine layer (src/lib/game/) into an Angular-style file system: one top-level type per file with role suffixes (*.interface.ts, *.model.ts, *.service.ts, *.helper.ts, *.constants.ts), organized into domain folders (cards/, units/, battle/, services/, helpers/) each with an index.ts barrel; consumers import from domain barrels only. Retroactive refactor of existing files (types.ts, engine.ts, commands.ts, effects.ts, history.ts, icons.ts) with all imports and tests updated in the same pass; 57 tests + build green is the gate. Verified on disk 2026-08-03: 57/57 tests, npm run build green, tsc --noEmit 0 errors, zero stale @/lib/game/* imports. Type-only fish-mafia-app ↔ fish-mafia-game cycle remains (erased at compile); value cycle engine.service ↔ effects.service preserved.