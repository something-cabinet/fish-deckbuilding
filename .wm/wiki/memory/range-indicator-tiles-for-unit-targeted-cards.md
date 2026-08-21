---
title: Range indicator tiles for unit-targeted cards
type: memory
tags: [targeting, board, ui]
status: active
---

cardTargets (src/lib/game/cards/services/targeting.service.ts) returns `tiles` for ALL target kinds: Enemy/Ally/Unit return the full in-range Manhattan diamond via rangeTiles() purely as the yellow range indicator; EmptyTile returns only empty in-range tiles (actual cast targets). Cast validation in actions.service.ts ignores tiles for unit-targeted cards, and Board tile click/drop only casts for EmptyTile cards, so indicator tiles never cause casts.