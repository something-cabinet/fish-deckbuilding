---
title: Add CardEffect union + effects field to types
type: task
tags:
- from-spec
- spec:card-effect-registry
status: done
priority: high
relates_to:
- type: implements
  target: wiki:specs:card-effect-registry
acceptance_criteria:
- text: CardEffect union exists with all 7 kinds incl. custom escape hatch (D5, D11)
  checked: true
- text: 'CardDef gains effects: CardEffect[]'
  checked: true
- text: an unresolvable/unknown effect kind is a compile error (AC-7)
  checked: true
assignee: orchestrator
---

Spec: card-effect-registry (FR-1, D1, D5, D11). Add the closed CardEffect discriminated union (damage/heal/drawCards/gainCoin/buffAtk/summon/custom) and effects: CardEffect[] to CardDef in types.ts. Exhaustiveness is compiler-enforced (AC-7). No resolver or data changes yet — types only.