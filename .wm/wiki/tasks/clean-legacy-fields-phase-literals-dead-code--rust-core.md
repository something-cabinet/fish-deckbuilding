---
title: Clean legacy fields, phase literals, dead code — Rust core
type: task
tags:
- godot
- rust
- refactor
- cleanup
status: todo
priority: medium
acceptance_criteria:
- text: Legacy phase literals replaced with core Phase model usage
  checked: false
- text: Dead code paths from the old deckbuilder system removed
  checked: false
- text: Rust core builds clean with no unused-code warnings
  checked: false
- text: cargo test passes
  checked: false
assignee: you
---

Sweep the Rust core (core/battle, core/combat, core/grid) and Godot bridge for legacy fields, phase string literals, and dead code left over from the old FaB/deckbuilder system now that the JS/Svelte frontend has been removed.