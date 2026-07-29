---
title: Clean legacy fields, phase literals, dead code — Rust core
type: task
id: wiki:tasks:clean-legacy-fields-phase-literals-dead-code--rust-core
status: todo
priority: medium
tags: [godot, rust, refactor, cleanup]
acceptance_criteria:
  - text: "Legacy phase literals replaced with core Phase model usage"
  - text: "Dead code paths from the old deckbuilder system removed"
  - text: "Rust core builds clean with no unused-code warnings"
  - text: "cargo test passes"
---

Sweep the Rust core (core/battle, core/combat, core/grid) and Godot bridge for legacy fields, phase string literals, and dead code left over from the old FaB/deckbuilder system now that the JS/Svelte frontend has been removed.