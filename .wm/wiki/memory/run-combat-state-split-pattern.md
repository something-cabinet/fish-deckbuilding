---
title: Run/Combat State Split Pattern
type: memory
tags: [pattern, state]
status: active
---

Always split roguelite state into RunState (persistent) and CombatState (per-battle). Copy run deck into battle deck on combat start. Discard battle deck on exit. Full entry: @wiki/patterns/run-combat-state-split