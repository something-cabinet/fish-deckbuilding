---
{}
relates_to:
  - {type: implements, target: wiki:specs:strictmode-command-regression-tests}
---

CodeceptJS e2e suite modeled on gehenna-app/apps/web-e2e: codecept.conf.ts (Playwright helper, chromium, url localhost:3000, show: !HEADLESS, retryFailedStep + screenshotOnFail), user-journeys/strictmode.journey.ts (Feature/Before/Scenario: start run, move a unit, cast a card, assert visible unit position + mana/coin text), page object(s) under pages/, steps.d.ts via codeceptjs def. Runs via npm run test:e2e (codeceptjs run --steps) and headless.