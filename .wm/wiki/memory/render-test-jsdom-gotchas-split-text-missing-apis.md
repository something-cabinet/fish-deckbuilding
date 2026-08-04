---
title: Render-test jsdom gotchas (split-text, missing APIs)
type: memory
tags: [testing, jsdom, vitest, react]
status: active
---

Render tests in jsdom: getByText only matches DIRECT text nodes — split markup like `Fish <span>Mafia</span>` or `Turn <span>{n}</span>` is unreachable via text regex; use getByRole("heading", {name}) or textContent matchers instead. jsdom lacks document.elementFromPoint, ResizeObserver, canvas getContext, Element.scrollTo — stub all in src/components/game/test-utils.tsx (installJsdomShims). Async flows (endTurn) need vi.useFakeTimers + advanceTimersByTimeAsync. Full: @wiki/patterns/render-test-jsdom-gotchas