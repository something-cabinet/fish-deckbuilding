---
title: Untested UI Layer Caused All P0s
type: memory
tags: [failure, testing]
status: active
---

Third occurrence: a fully unit-tested pure function (pply_affixes_to_effects) was never called by the orchestration layer, so crafted card bonuses had no gameplay effect — masked by an unreachable export. When you see a core function that is fully tested but never imported at the orchestration call sites, grep its call sites before trusting the feature works.