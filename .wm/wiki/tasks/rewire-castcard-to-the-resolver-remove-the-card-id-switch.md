---
title: Rewire castCard to the resolver; remove the card-id switch
type: task
tags:
- from-spec
- spec:card-effect-registry
status: in-progress
priority: high
relates_to:
- type: implements
  target: wiki:specs:card-effect-registry
acceptance_criteria:
- text: castCard contains no switch on card.def.id (AC-3, grep-verifiable)
  checked: false
- text: all 9 card parity tests still green (NFR-2)
  checked: false
- text: no per-card command classes exist (AC-13 partial)
  checked: false
---

Spec: card-effect-registry (FR-3, D4). castCard keeps hand lookup, mana check, cardTargets validation, pay + move-to-discard, cleanupDead, checkEnd — and delegates effect application to the resolver. Delete the switch on card.def.id (AC-3). All parity tests stay green (NFR-2).