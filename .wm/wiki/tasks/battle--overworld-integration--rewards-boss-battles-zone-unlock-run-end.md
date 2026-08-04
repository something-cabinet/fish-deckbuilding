---
title: Battle ↔ overworld integration — rewards, boss battles, zone unlock, run end
type: task
tags:
- from-spec
- spec:overworld-map
- integration
status: done
priority: high
relates_to:
- type: implements
  target: wiki:specs:overworld-map
acceptance_criteria:
- text: 'AC-5: Clicking a Battle node starts a combat encounter'
  checked: false
- text: 'AC-6: Winning a battle shows a reward screen with 3 card choices + gold'
  checked: false
- text: 'AC-7: After reward, return to map at the current node'
  checked: false
- text: 'AC-8: Losing a battle returns to map at current node (no permadeath)'
  checked: false
- text: 'AC-9: Rest node heals hero 30% max HP and greys out after use'
  checked: false
- text: 'AC-10: Boss node starts a battle with a unique boss unit'
  checked: false
- text: 'AC-11: Winning a Boss node unlocks the next zone'
  checked: false
- text: 'AC-20: Defeating Zone 3 Boss shows a run summary'
  checked: false
assignee: you
---

Wire overworld into the app: fish-mafia-app.tsx adds overworld/battle screens + transitions, fish-mafia-game.tsx accepts win/lose callbacks and initial battle state (hero HP/deck/enemies from overworld), result-overlay.tsx shows Continue to Map after win, reward-screen.tsx choose-1-of-3 cards + gold. Battle node → combat, win → reward → map (node cleared); rest node heals 30% max HP; boss node → boss battle, win unlocks next zone with story text, final boss defeat shows run summary.