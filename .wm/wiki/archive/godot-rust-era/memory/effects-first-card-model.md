---
title: Effects-First Card Model
type: memory
tags: [cards, rust, game-design]
---

Cards use an effects-first data model: each card has a list of effects (Damage, Heal, Shield, DrawCards, ApplyBuff) with range and cross-shaped AoE targeting. Same CardDef used for player and enemy. Full reference: @wiki/patterns:effects-first-card-model