---
title: Affix-Based Effect Composition Pattern
type: memory
tags: [affix, cards, pattern, crafting]
status: active
---

Affixes are a separate data layer composing with base card effects at resolution time. Each affix carries stat bonuses targeting an effect index. All crafting operations are pure functions returning new CardDefs. Full reference: @wiki/patterns/affix-based-effect-composition