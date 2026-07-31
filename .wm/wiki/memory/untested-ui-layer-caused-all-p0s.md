---
title: Untested UI Layer Caused All P0s
type: memory
tags: [failure, testing]
status: active
---

All P0 bugs across three occurrences (roguelite, tactical RPG, godot-rust bridge) lived in the untested UI/bridge wiring layer, never the well-tested pure function core. Third occurrence: a fully unit-tested pure function (`apply_affixes_to_effects`) was never called by the bridge, so crafted card bonuses had no gameplay effect — masked by `#[allow(dead_code)]`. When you see that attribute on a `pub fn` in core/, grep its call sites before trusting the feature works. Full reference: @wiki/concepts/untested-ui-orchestration-p0s