---
title: Component render test — FishMafiaGame move + cast via DOM
type: task
tags:
- from-spec
- spec:strictmode-command-regression-tests
status: done
priority: medium
implementation_notes: 'Implemented. src/lib/game/__tests__/fish-mafia-game.strictmode.test.tsx — 2 tests rendering <FishMafiaGame settings={DEFAULT_SETTINGS} onExit={noop}> under <StrictMode>: (1) click hero → click teal reachable tile → hero aria-label moves off B3; (2) scan dealt hand at runtime, cast first affordable card (self-target single click, or arm + click enemy for damage), assert card leaves hand + mana/coin/HP effect. Random-hand robust (20-run probe: damage 9x, coin 5x, draw 3x, documented early-return 3x ≈4%). jsdom shims: canvas 2D no-op proxy, ResizeObserver stub, scrollTo no-op.'
relates_to:
- type: implements
  target: wiki:specs:strictmode-command-regression-tests
acceptance_criteria:
- text: 'AC-3: component render test renders <FishMafiaGame> with settings + onExit props in jsdom and asserts move + cast via DOM'
  checked: false
- text: 'AC-5: npm test stays green with all render tests passing'
  checked: false
assignee: orchestrator
---

Integration render test: render <FishMafiaGame> (with GameSettings/DEFAULT_SETTINGS and onExit props) in jsdom, drive interactions via fireEvent/userEvent (click hero, click reachable tile to move; click card + target to cast), assert DOM reflects results (hero aria-label position, mana/coin text, card removed from hand). Supplies the second tier of regression coverage.