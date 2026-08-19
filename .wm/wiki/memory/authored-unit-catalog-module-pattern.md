---
title: Authored unit-catalog module pattern
type: memory
tags: [pattern, design-tool, persistence]
status: active
---

New "design-tool-authored, engine-resolved-by-id" domains (characters, enemies, summons) all follow the same 6-piece shape: model + Zod schema w/ compile-time drift guard + JSON db + library loader (DEFS/LIBRARY/IDS/DEFAULT/FALLBACK/resolve*) + dev-only CRUD API route + create-screen/face/library-screen trio. Follow it for the next one rather than improvising. Full reference: @wiki/patterns/authored-unit-catalog-module