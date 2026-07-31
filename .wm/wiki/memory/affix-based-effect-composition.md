---
title: Affix-Based Effect Composition Pattern
type: memory
tags: [affix, cards, pattern, crafting]
status: active
---

Affixes are a separate data layer composing with base card effects at resolution time. Each affix carries stat bonuses targeting an effect index. All crafting operations are pure functions returning new CardDefs. Pitfall: the composition function must actually be called at every gameplay call site — it shipped as `#[allow(dead_code)]` once because the battle bridge read `card.effects` directly instead, so crafted bonuses had zero effect in combat despite passing unit tests. Full reference: @wiki/patterns/affix-based-effect-composition