---
title: Pure reducer + in-state history (StrictMode-safe by construction)
type: memory
tags: [react, state-management, strictmode, reducer, undo]
status: active
---

Pure reducer with in-state history is the StrictMode-safe state pattern: reduce(state, action) → {state, fx} + HistoryBundle {state, past, future} in the state, undo/redo pure functions — updaters pure by construction, no refs/session classes. Applied in the engine reducer rewrite (2026-08-13); replaces the external-drain workaround. Full: @wiki/patterns/pure-reducer-history-in-state