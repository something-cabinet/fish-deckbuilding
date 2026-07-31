---
title: TDD — Test-First for Everything
type: rule
tags:
- tdd
- convention
- testing
status: active
---

# TDD — Test-First for Everything

Red-Green-Refactor applies to ALL implementation.

## Red-Green-Refactor

1. **RED** — Write a failing test for the next behavior first. Run it; watch it fail for the right reason (assertion, not compile error). Never skip this.
2. **GREEN** — Write the minimal implementation that makes the test pass. No extra features, no speculative code.
3. **REFACTOR** — Clean up the code under the safety net of the now-passing tests. Duplication, naming, structure. Tests stay green after every refactor step.

## Rules

- Test first, always — no implementation without a failing test (`npx vitest run` / `cargo test`).
- One behavior per test; name tests by behavior, not implementation.
- Orchestration/integration layers get tests too — untested bridge wiring is where every P0 in this project's history lived (see wiki:core:critical-patterns). Never delete orchestrator tests without replacement.
- Compiler-driven where possible: types/enums/Result catch rule violations before tests run.
- Run the full suite before considering work complete.
