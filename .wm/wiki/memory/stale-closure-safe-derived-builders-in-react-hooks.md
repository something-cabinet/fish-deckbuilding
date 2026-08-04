---
title: Stale-closure-safe derived builders in React hooks
type: memory
tags: [pattern, react, stale-closure, hooks, async]
status: active
---

In React, setState lands async, so an action (e.g. travel(nodeId)) followed by a derived builder (buildBattleState()) reads the STALE closure state — boss battles would build the wrong lineup. Fix: builders accept the action's input as an override arg (buildBattleState(nodeId?)) and callers pass it explicitly. Full reference: @wiki/patterns/stale-closure-safe-derived-builders