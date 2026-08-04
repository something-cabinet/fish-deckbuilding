---
title: Overworld state hook + save/continue prompt
type: task
tags:
- from-spec
- spec:overworld-map
- state
status: done
priority: high
relates_to:
- type: implements
  target: wiki:specs:overworld-map
acceptance_criteria:
- text: 'AC-16: State is saved to localStorage on node transitions'
  checked: false
- text: 'AC-17: On app start, existing save is detected with Continue / New Run options'
  checked: false
- text: 'AC-18: New Run clears saved state and starts fresh'
  checked: false
- text: 'AC-13: Gold total persists'
  checked: false
- text: 'AC-14: Hero HP carries forward'
  checked: false
assignee: you
---

Add use-overworld.ts hook managing OverworldState (hero HP, gold, deck, zone, node), node transitions, auto-save to localStorage. Add save-prompt.tsx Continue/New Run overlay shown when a saved run exists on app start. New Run clears state and starts fresh from Zone 1.