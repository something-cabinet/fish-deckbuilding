---
title: Untested UI Layer Caused All P0s
type: memory
tags: [failure, testing]
status: active
---

7 P0 bugs across 3 Oracle reviews — ALL in untested BattleHUD.svelte. Zero bugs in tested pure function layer. Root cause: no integration tests for UI wiring. Full entry: @wiki/concepts/untested-ui-orchestration-p0s