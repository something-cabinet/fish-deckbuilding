---
title: Card Stat Balance Pass — FaB Model
type: spec
tags:
- spec
- cards
- balance
- fab
status: approved
---

---
title: Card Stat Balance Pass — FaB Model
type: spec
tags: [cards, balance, design, fab]
status: draft
---

## Overview

Review and rebalance all 39 card stats against Flesh and Blood (FaB) balancing principles. Cards now use FaB-style pitch coloring (coinValue = color: 1=red, 2=yellow, 3=blue) with a strict power curve where higher coinValue = lower stats. Cost range expanded to 0-4 with attack values up to 7.

## Locked Decisions

- D1: **Color by coinValue** — coinValue 1 = red (#e85d4e), 2 = yellow (#f4c430), 3 = blue (#3b82f6)
- D2: **Strict FaB power curve** — At the same cost, higher coinValue = lower attack/defense
- D3: **Cost range 0-4** with attack up to 7

## Cost/Attack Curve

| Cost | Attack Range | Notes |
|------|-------------|-------|
| 0 | 1-2 | Basic strikes, filler cards |
| 1 | 2-4 | Standard attacks |
| 2 | 3-5 | Workhorse cards |
| 3 | 4-6 | Strong mid-range |
| 4 | 6-7 | Heavy hitters, signature cards |

Defense values generally 1-4, scaled similarly by cost and coinValue.

## Requirements

### Functional Requirements
- FR-1: Card `color` set by coinValue: 1→#e85d4e, 2→#f4c430, 3→#3b82f6 (computed per-card)
- FR-2: At any given cost, cards follow: coinValue 1 (red) > coinValue 2 (yellow) > coinValue 3 (blue) for attack/defense
- FR-3: Attack range follows the approved curve (cost 2→3-5, cost 3→4-6, cost 4→6-7)
- FR-4: No cost-0 card has attack >2
- FR-5: Starter deck (10 cards) remains winnable against early encounters
- FR-6: Card descriptions reviewed and updated to match stat changes

### Non-Functional Requirements
- NFR-1: 92 tests continue to pass
- NFR-2: 0 svelte-check errors

## Acceptance Criteria

- [ ] AC-1: All 39 cards colored by coinValue (1=red, 2=yellow, 3=blue)
- [ ] AC-2: All 39 cards follow the approved cost/attack curve
- [ ] AC-3: FaB power curve enforced (higher coinValue = lower stats at same cost)
- [ ] AC-4: At least 2 cards at cost 4 with attack 6-7
- [ ] AC-5: No cost-0 card has attack >2
- [ ] AC-6: Card descriptions updated to match new stats
- [ ] AC-7: 92 tests pass, 0 svelte-check errors

## Scenarios

### Scenario 1: Red Card (High Power)
**Given** a cost-2, coinValue-1 (red) card
**When** played
**Then** it deals 4-5 damage (higher than same-cost yellow/blue)

### Scenario 2: Blue Card (Resource Focus)
**Given** a cost-2, coinValue-3 (blue) card
**When** sold
**Then** it gives 3 coins
**When** played
**Then** it deals 3 damage (lower than same-cost red/yellow)

### Scenario 3: Cost-4 Heavy Hitter
**Given** a cost-4, coinValue-1 (red) card
**When** played
**Then** it deals 6-7 damage

## Technical Notes

- Card color helper: `function coinColor(v: number): string { return v === 1 ? '#e85d4e' : v === 2 ? '#f4c430' : '#3b82f6' }`
- Apply in `cardData.ts` — each card's `color` field becomes `coinColor(coinValue)`
- Review CardTooltip, HandViewer, CardReward for any remaining hardcoded type colors — all should use `card.color`
- Defense values follow same coinValue curve: red > yellow > blue at same cost

## Open Questions

- [ ] Should keywords/effects reduce base stats? (keyword-heavy card = lower attack)
- [ ] Should relics be rebalanced alongside cards?

## References

- @task-tasks:card-stat-balance-pass-against-fab-model
- @wiki/decisions/fab-style-action-card-type