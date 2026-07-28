---
title: Card stat balance pass against FaB model
type: task
id: wiki:tasks:card-stat-balance-pass-against-fab-model
status: todo
priority: medium
tags: [cards, balance, design, fab]
acceptance_criteria:
  - text: "All 39 cards reviewed for attack/cost curve against FaB ranges"
  - text: "coinValue distribution balanced — fair number of red/yellow/blue equivalent cards"
  - text: "No cards with anomalous stats (e.g., cost 0 with attack 5)"
  - text: "Card descriptions updated to reflect any stat changes"
  - text: "92 tests pass, 0 svelte-check errors"
---

Review all 39 card stat values (attack, defense, cost, coinValue) against Flesh and Blood balancing principles. FaB's pitch system maps directly: red (pitch 1) = high power/low resource, yellow (pitch 2) = moderate, blue (pitch 3) = lower power/high resource. Ensure cost-attack-defence curves match expected ranges. Add pitch-equivalent color differentiation if desired.