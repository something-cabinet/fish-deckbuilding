---
title: Pure setState updaters — drain external queues via stateRef + commit
type: memory
tags: [react, strictmode, state-management, pattern]
status: active
---

React pattern for StrictMode safety: NEVER mutate an external queue/session inside a setState updater — StrictMode double-invokes updaters in dev, so the first (discarded) call consumes the side effect and the action silently no-ops. Fix: keep `stateRef.current = state` in sync each render, drain the queue synchronously OUTSIDE setState against `stateRef.current`, then `setState(ns)` with the concrete value. All command actions route through a `commit()` callback doing this. Full: @wiki/patterns/pure-setstate-updaters-external-drain · bug: @wiki/concepts/strictmode-double-invoke-impure-updater