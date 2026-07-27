---
title: TDD Convention — Test First
type: memory
tags: [convention, tdd, testing, workflow]
status: active
---

# TDD Convention — Test-First for Everything

**Red-Green-Refactor** applies to ALL implementation:
1. **RED** — Write a failing test first
2. **GREEN** — Write minimum code to pass it
3. **REFACTOR** — Clean up with tests green

No implementation code is written without a test first. This includes combat logic, state transitions, card effects, enemy AI, and all game code. UI components (Svelte) are excluded — they call tested pure functions.

```bash
npm test       # run all tests
npm run test:watch  # watch mode
```
