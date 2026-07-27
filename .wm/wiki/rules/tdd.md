---
title: TDD — Test-First for Everything
type: rule
id: wiki:rules:tdd
tags: [tdd, convention, testing]
---

# TDD — Test-First for Everything

**Red-Green-Refactor** applies to ALL implementation:

1. **RED** — Write a failing test that defines the expected behavior
2. **GREEN** — Write the minimum code to make it pass
3. **REFACTOR** — Clean up while tests stay green

No implementation code is written without a test first. This includes combat logic, state transitions, card effects, enemy AI, and any other game code. UI components (Svelte) are excluded — they call tested pure functions.

```bash
npm test       # run all tests
npm run test:watch  # watch mode
```

Tests live in `src/game/combat/__tests__/` and run in ~400ms.
