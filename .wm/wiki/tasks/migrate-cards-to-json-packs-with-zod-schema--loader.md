---
title: Migrate cards to JSON packs with zod schema + loader
type: task
tags:
- from-spec
- spec:card-effect-registry
status: in-progress
priority: high
relates_to:
- type: implements
  target: wiki:specs:card-effect-registry
acceptance_criteria:
- text: every card in JSON packs declares an effects list matching PRODUCT.md, loader produces the same CARD_LIBRARY (AC-4)
  checked: false
- text: schema derives from TS types via z.infer; union change fails type-check until schema regenerated (AC-16)
  checked: false
- text: malformed card JSON throws at load; no silent fallback (AC-8)
  checked: false
---

Spec: card-effect-registry (FR-7, FR-13, D8, NFR-6/7). Move the 9 card defs from data.ts into per-pack JSON files (cards/*.json), each card declaring an effects list matching PRODUCT.md behavior. Add zod dependency; schema is a discriminatedUnion mirroring the TS CardEffect union via z.infer (FR-13, AC-16). data.ts becomes a typed loader that validates at load and throws loudly on malformed data (FR-7, AC-8). CARD_LIBRARY output must equal today's (AC-4).