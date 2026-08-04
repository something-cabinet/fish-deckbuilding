---
title: StrictMode Command Regression Tests — Hook + Component + E2E Coverage
type: spec
status: approved
tags: [testing, react, strictmode, regression, e2e, codeceptjs, spec, approved]
---

## Overview

Regression tests for the StrictMode impure-updater bug (2026-08-03) that silently broke every command action (move/cast/attack/sell/buy). The bug: `useFishMafia` passed `setState(drain)` where `drain` consumed the `GameSession` command queue as a side effect; React 19 dev StrictMode double-invokes updater functions, so the first (discarded) invocation drained the command and the second returned unchanged state → React bailed → no re-render. Engine tests cannot catch this (vitest doesn't render through React); tests must render through React under StrictMode.

Tiered coverage (D1): hook render test (fast, primary regression net) + component render test (integration) + CodeceptJS e2e smoke (faithful, slow). All command actions asserted (D2). Infrastructure per-file jsdom + separate e2e script (D3). CodeceptJS setup modeled on the reference repo `vpp/gehenna-app` `apps/web-e2e/` (D4).

## Locked Decisions

- D1: **Tiered coverage** — hook render test + component render test + CodeceptJS e2e smoke.
- D2: **All command actions** — assert move, cast, attack, sell, buy, endTurn observable outcomes.
- D3: **Infra** — render tests use `// @vitest-environment jsdom` docblock (engine tests stay node); new dev deps `@testing-library/react`, `jsdom`, `@testing-library/jest-dom`, and CodeceptJS e2e: `codeceptjs`, `playwright`, `ts-node`; e2e as `npm run test:e2e`.
- D4: **Reference-modeled e2e** — CodeceptJS + Playwright helper in a dedicated `e2e/` suite with `codecept.conf.ts`, `.journey.ts` scenarios, page objects, `--steps` + `HEADLESS=true` scripts, mirroring `gehenna-app/apps/web-e2e/`.

## Requirements

### Functional Requirements

- FR-1: Hook render test renders `useFishMafia` inside a `<StrictMode>` wrapper (vitest dev React build double-invokes updaters, reproducing the bug mechanism).
- FR-2: The hook test asserts observable state outcomes for every command action: move (unit position + hasMoved), cast (mana decrease + card leaves hand), attack (enemy HP decrease), sell (coin increase + card leaves hand), buy (coin decrease + hand grows), endTurn (turn advances past enemy phase).
- FR-3: Component render test renders `<FishMafiaGame>` (with `settings` + `onExit` props) in jsdom, drives interactions via `fireEvent`/`userEvent`, and asserts DOM reflects command results (e.g. hero aria-label changes after a move click, coin text after casting).
- FR-4: CodeceptJS e2e smoke (single `.journey.ts` feature) loads the dev server, starts a run, performs move + cast, asserts visible state change. BDD style (`Feature`/`Scenario`/`Before`) with the Playwright helper backend and page objects (D4).
- FR-5: Tests must FAIL against the pre-fix impure `setState(drain)` code and PASS against the current `commit()` fix (red-green validation documented).
- FR-6: Engine tests remain on node environment (unchanged); render tests opt into jsdom per-file.

### Non-Functional Requirements

- NFR-1: Hook test runs in seconds — it is the fast regression gate for any future change to the drain/commit path.
- NFR-2: No flaky timing asserts in hook/component tests (no real `setTimeout` waits for enemy phase beyond a short bounded async flush).
- NFR-3: E2E script is explicit (`npm run test:e2e`), not part of default `npm test` (slow).
- NFR-4: No React event-handler warnings fail the run; silence or assert known `act()` warnings.
- NFR-5: CodeceptJS e2e is deterministic — `I.waitFor*` helpers, no hard-coded sleeps; headed by default, `HEADLESS=true` for CI (reference pattern).

## Acceptance Criteria

- [ ] AC-1: `use-fish-mafia.strictmode.test.tsx` (or equivalent name) renders the hook under `<StrictMode>` and asserts move/cast/attack/sell/buy/endTurn outcomes (FR-1, FR-2).
- [ ] AC-2: The hook test is verified RED against the pre-fix `setState(drain)` version and GREEN against the current fix (documented in the test file comment).
- [ ] AC-3: Component render test renders `<FishMafiaGame>` in jsdom and asserts at least move + cast via DOM (FR-3).
- [ ] AC-4: CodeceptJS e2e suite exists: `codecept.conf.ts` (Playwright helper, `url: http://localhost:3000`, `browser: chromium`, `show: !process.env.HEADLESS`, `retryFailedStep` + `screenshotOnFail` plugins), at least one `user-journeys/*.journey.ts` asserting move + cast, page object(s) under `pages/`, `steps.d.ts`; runs via `npm run test:e2e` (`codeceptjs run --steps`) and headless via `npm run test:e2e:headless` (FR-4, D4).
- [ ] AC-5: `npm test` stays green (57 engine tests + new render tests) with engine tests still on node env (FR-6, NFR-1).
- [ ] AC-6: New dev deps added to package.json (`codeceptjs`, `playwright`, `ts-node`, `@testing-library/react`, `jsdom`, `@testing-library/jest-dom`); `codecept.conf.ts` committed; e2e scripts added; README/dev note documents `npm test` vs `npm run test:e2e`.

## Scenarios

### Scenario 1: Regression returns (hook test catches it)
**Given** someone reintroduces an impure updater (`setState(drain)` consuming the queue)
**When** the hook render test runs under StrictMode
**Then** the first double-invoked call consumes the command, state stays unchanged, and the move/cast assertion fails — test is RED.

### Scenario 2: Current fix stays green
**Given** the current `commit()` fix (drain outside updater, concrete `setState(ns)`)
**When** the hook render test runs under StrictMode
**Then** all command-action assertions pass — test is GREEN.

### Scenario 3: Engine-only changes
**Given** a pure engine refactor (e.g. balance change)
**When** `npm test` runs
**Then** engine tests run on node env unaffected by jsdom; render tests still validate the React layer.

### Scenario 4: CodeceptJS e2e smoke
**Given** `npm run test:e2e` with the dev server reachable at `http://localhost:3000`
**When** the CodeceptJS journey starts a run, moves a unit, and casts a card
**Then** the visible UI reflects the actions (unit position, mana/coin text) with no console errors; failing steps retry once and screenshot to `./output`.

## Technical Notes

- StrictMode updater double-invocation requires a **development** React build — vitest defaults to dev React (`NODE_ENV=test`), so `renderHook(..., { wrapper: StrictMode })` reproduces it.
- `useFishMafia` uses `useEffect` (startGame on mount) and `setTimeout` FX purge — use `act()` + `waitFor` for the mount effect; purge timers with `vi.useFakeTimers()` or assert within the 1.2s window bounded.
- Enemy phase in `endTurn` awaits real delays — in the hook test, assert only that `state.turn` advanced past the enemy phase using fake timers, or assert phase transition with real short waits capped.
- Component test must supply `settings` (GameSettings/DEFAULT_SETTINGS) and `onExit` props to `<FishMafiaGame>`.
- **CodeceptJS setup (reference: `vpp/gehenna-app` `apps/web-e2e/`, branch `dev`):**
  - `codecept.conf.ts` (TypeScript config), Playwright helper: `url: "http://localhost:3000"` (our dev port), `browser: "chromium"`, `show: !process.env.HEADLESS`, `windowSize: "1280x720"`, `tests: "./user-journeys/*.journey.ts"`, `output: "./output"`, plugins `retryFailedStep: { enabled: true }` + `screenshotOnFail: { enabled: true }`, `include` mapping page objects.
  - Scripts: `test:e2e` → `codeceptjs run --steps`; `test:e2e:headless` → `HEADLESS=true codeceptjs run --steps`. (Reference also has `test:sm` → `--grep @semantic-monitoring` — optional.)
  - Dev deps: `codeceptjs ^3.6`, `playwright ^1.49`, `ts-node ^10.9`; generate `steps.d.ts` via `codeceptjs def`.
  - Journey style: `Feature("...")`, `Before(async ({ I, pageObj }) => { I.amOnPage("/"); ... })`, `Scenario("...", async ({ I, pageObj }) => { ... I.seeInCurrentUrl / I.waitForText })`. Page objects under `pages/*.page.ts` injected via `include` and destructured args.
  - Reference runs e2e manually/headed (dev) and `HEADLESS=true` (CI); its CI does NOT run e2e — mirror that: keep e2e out of default `npm test`.
- E2E determinism: prefer `I.waitFor*` helpers over fixed sleeps; assert on visible text (unit label, coin/mana values).
- Known prior-art for regression validation: bug root cause documented in @wiki/memory/react-strictmode-double-invoke-breaks-impure-setstate-updaters-command-drain.

## Open Questions

- [ ] Should the CodeceptJS e2e assume a manually-running dev server, or should `npm run test:e2e` wrap it with a pre-run `next dev` (e.g. `concurrently`/shell)? (Reference assumes a running server via `url`.)
- [ ] Fake timers vs real waits for the endTurn enemy-phase assertion in the hook test?