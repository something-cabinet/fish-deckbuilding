---
title: Update stale docs (CONVENTIONS, ARCHITECTURE, DESIGN.md) to real Next.js/React stack + new file convention
type: task
tags:
- from-spec
- spec:angular-style-file-system
status: done
priority: medium
relates_to:
- type: implements
  target: wiki:specs:angular-style-file-system
acceptance_criteria:
- text: 'AC-8: CONVENTIONS.md describes the actual Next.js/React stack and the one-per-file + barrel convention as the standard'
  checked: true
- text: 'AC-9: ARCHITECTURE.md stack section matches the real repo (Next.js 16 + React 19 + Tailwind v4; no retired Godot/Rust pivot text as current state)'
  checked: true
- text: 'AC-10: DESIGN.md component map updated to the real src/ layout and current app shell topology'
  checked: true
assignee: orchestrator
---

Update stale docs to the real stack + new file convention. DESIGN.md component map rewritten to real src/ topology (app shell + 3 screens + battle widgets, corrected src/ paths). wiki:core:conventions and wiki:core:architecture rewritten to the actual Next.js 16 + React 19 + Tailwind v4 stack and the Angular-style one-per-file + barrel convention; retired Godot/Rust pivot text removed as current state. Done 2026-08-03.