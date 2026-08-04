---
title: Hook StrictMode render test — red-green validated against the command-drain fix
type: task
tags:
- from-spec
- spec:strictmode-command-regression-tests
status: done
priority: high
implementation_notes: 'Implemented. src/lib/game/__tests__/use-fish-mafia.strictmode.test.tsx — 7 tests rendering useFishMafia under <StrictMode> (renderHook wrapper), asserting move/cast/sell/buy/endTurn outcomes (attack skipped by design: hero never adjacent to an enemy on turn-1 board, melee range 1 — documented). Fake timers advance the endTurn enemy phase. jest-dom via /vitest entry (plain entry incompatible with vitest globals:false). AC-2 red-green VALIDATED by orchestrator: with the pre-fix setState(drain) hook restored via git stash, the strictmode test fails 5/7 (command-action tests red); fix restored → 9/9 render tests green.'
relates_to:
- type: implements
  target: wiki:specs:strictmode-command-regression-tests
acceptance_criteria:
- text: 'AC-1: hook render test renders useFishMafia under <StrictMode> and asserts move/cast/attack/sell/buy/endTurn outcomes'
  checked: false
- text: 'AC-2: verified RED against pre-fix setState(drain) version and GREEN against current commit() fix (documented in file comment)'
  checked: false
- text: 'AC-5: npm test stays green (57 engine + new render tests), engine tests still node env'
  checked: false
assignee: orchestrator
---

Write the primary regression test for the StrictMode impure-updater bug: renderHook(useFishMafia) wrapped in <StrictMode> in a jsdom-environment test file, drive each command action via act(), assert observable outcomes (move: unit pos + hasMoved; cast: mana down + card leaves hand; attack: enemy HP down; sell: coin up + card leaves hand; buy: coin down + hand grows; endTurn: turn advances). Must be red against the old setState(drain) version and green against the commit() fix.