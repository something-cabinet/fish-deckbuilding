---
title: SummonDef has no team field
type: memory
tags: [summons, cards, team]
status: active
---

SummonDef (src/lib/game/summons/) carries only hp/atk/move/range/icon, no team — unlike EnemyDef/CharacterDef. A summoned unit's team is assigned at effects.service.ts's "summon" spawn site, currently hardcoded to Team.Player since castCard is player-only (no enemy-cast-card path exists yet). Full reference: @wiki/decisions/summon-def-has-no-team-field