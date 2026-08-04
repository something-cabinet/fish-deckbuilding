---
title: Add render-test + CodeceptJS e2e infrastructure and scripts
type: task
tags:
- from-spec
- spec:strictmode-command-regression-tests
status: done
priority: high
implementation_notes: 'Implemented. devDeps added: @testing-library/react 16.3.2, @testing-library/jest-dom 7, jsdom 30, codeceptjs 4.1.0 (note: v4, reference repo used ^3.6), playwright 1.62.1, ts-node. Scripts test:e2e (codeceptjs run --steps) + test:e2e:headless (HEADLESS=true). codecept.conf.ts validates (codeceptjs list loads Playwright helper, url localhost:3000, chromium, show: !HEADLESS, retryFailedStep + screenshotOnFail plugins). README Quick Start documents npm test vs npm run test:e2e. Fixed a malformed package-lock.json entry (@rolldown/binding-android-arm64, empty version) that broke all npm installs.'
relates_to:
- type: implements
  target: wiki:specs:strictmode-command-regression-tests
acceptance_criteria:
- text: 'AC-6a: devDeps added: @testing-library/react, jsdom, @testing-library/jest-dom, codeceptjs, playwright, ts-node'
  checked: false
- text: 'AC-6b: e2e scripts added: test:e2e (codeceptjs run --steps) and test:e2e:headless (HEADLESS=true codeceptjs run --steps)'
  checked: false
- text: 'AC-6c: codecept.conf.ts committed with Playwright helper (chromium, url localhost:3000, show: !HEADLESS, retryFailedStep + screenshotOnFail plugins)'
  checked: false
- text: 'AC-6d: README/dev note documents npm test vs npm run test:e2e'
  checked: false
assignee: orchestrator
---

Add test infrastructure per spec strictmode-command-regression-tests (D3/D4): dev deps for render tests (@testing-library/react, jsdom, @testing-library/jest-dom) and CodeceptJS e2e (codeceptjs, playwright, ts-node); codecept.conf.ts with Playwright helper; e2e scripts test:e2e / test:e2e:headless; README note. Engine tests remain on node env.