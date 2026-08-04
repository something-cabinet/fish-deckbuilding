---
{}
relates_to:
  - {type: references, target: wiki:memory:test-placement-colocate-units-centralize-integration-spec-naming-2026-08-04}
---

---
title: Pattern: Render-test jsdom gotchas
type: pattern
id: wiki:patterns:render-test-jsdom-gotchas
status: draft
tags: [pattern, testing, vitest, jsdom, react]
---

## Problem

Component render tests in jsdom hit several silent, non-obvious failures: text queries that can't find split text nodes, missing browser APIs that crash components, and async game flows that never resolve. Each cost real debugging time in this repo.

## Solution

Centralize the environment shims and know the query gotchas:

### Split-text nodes break `getByText`

`getByText` matches **direct text nodes only** — markup like `Fish <span>Mafia</span>` or `Turn <span>{n}</span>` is unreachable via `getByText(/fish mafia/i)` and `getByText(/turn 2/i)`. Fixes:
- Heading/role queries: `getByRole("heading", { level: 1, name: /fish mafia/i })` — accessible name concatenates descendants
- Text-content matcher: `getByText((_, el) => el?.textContent === "Turn 2")`
- Match the label node alone: `getByText(/^Turn/i)` (whitespace is trimmed by the default normalizer)

### jsdom lacks browser APIs — stub them once

Components that touch canvas/observer/scroll crash in jsdom. Extract into a shared `test-utils.tsx`:

- `HTMLCanvasElement.prototype.getContext` → noop Proxy (ParticleCanvas)
- `ResizeObserver` → stub class (ParticleCanvas)
- `Element.prototype.scrollTo` → noop (SidePanel)
- `document.elementFromPoint` → `() => null` (targeting-arrow/drag code; jsdom does not implement it at all)

### Async flows need fake timers

`endTurn` awaits chained `setTimeout` waits. Use `vi.useFakeTimers()` + `await act(async () => { await vi.advanceTimersByTimeAsync(10_000) })`, then `vi.useRealTimers()` in `afterEach`. Real-timer `waitFor` timeouts are flaky/slow.

### Random-state variance

Suites driving a random opening hand (shuffled deck) produce run-to-run coverage variance of ±5%. Either assert on the observable outcome (wait for cards to appear) or seed the shuffle for a deterministic coverage gate.

## When to Use

- Any component render test using jsdom + Testing Library in this repo
- Adding coverage for game/board/particle components

## When Not to Use

- Pure engine unit tests (no DOM) — these don't need the shims
- Tests already using a full canvas library or real browser runner

## Related

- @wiki/memory/test-placement-colocate-units-centralize-integration-spec-naming-2026-08-04
- src/components/game/test-utils.tsx (the shared shim module)