---
title: React StrictMode double-invoke breaks impure setState updaters (command drain)
type: memory
tags: [react, strictmode, debugging, state-management, failure]
status: active
---

React StrictMode double-invokes setState updater functions (dev only, Next.js default). Bug (2026-08-03, cost ~1hr): use-fish-mafia.ts passed `setState(drain)` where drain consumed the GameSession command queue as a side effect. First invocation drained the command (discarded), second found empty queue and returned unchanged state → React bailed → move/cast/attack/sell/buy silently no-oped (mana, cards, HP, movement all frozen) while endTurn appeared to work (enemy steps advanced turn via separate pure updaters). Tests pass because vitest doesn't render through React. FIX: drain synchronously outside setState via a stateRef (latest committed state), commit with `setState(ns)` of a concrete value; keep all setState updaters pure. Pattern applies to ANY React hook that mutates an external queue/session inside an updater. Verifying in browser was essential — Node/tsx/vitest all pass while the browser breaks.