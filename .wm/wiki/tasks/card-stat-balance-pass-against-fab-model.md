---
title: Card stat balance pass against FaB model
type: task
tags:
- cards
- balance
- design
- fab
status: todo
priority: medium
acceptance_criteria:
- text: All 39 cards reviewed for attack/cost curve against FaB ranges
  checked: false
- text: coinValue distribution balanced — fair number of red/yellow/blue equivalent cards
  checked: false
- text: No cards with anomalous stats (e.g., cost 0 with attack 5)
  checked: false
- text: Card descriptions updated to reflect any stat changes
  checked: false
- text: 92 tests pass, 0 svelte-check errors
  checked: false
assignee: you
---

Review all 39 card stat values (attack, defense, cost, coinValue) against Flesh and Blood balancing principles. FaB's pitch system maps directly: red (pitch 1) = high power/low resource, yellow (pitch 2) = moderate, blue (pitch 3) = lower power/high resource. Ensure cost-attack-defence curves match expected ranges. Add pitch-equivalent color differentiation if desired.