---
{}
relates_to:
  - {type: references, target: wiki:specs:js-combat-vertical-slice}
---

---
title: Decision: No-Summon, Unique-Per-Card Effects in Combat
type: decision
id: wiki:decisions:no-summon-unique-card-effects
status: approved
tags: [decision, cards, combat, design]
---

# Decision: No-Summon, Unique-Per-Card Effects in Combat

## Context

The original deckbuilder-era design used generic card types (attack/defense/equipment/recruit) with a Duelyst-style summon mechanic. During the JS slice spec exploration, the user removed summoning and required that **each card has its own unique effect** — no shared archetypes. The starter deck is 10 unique cards × 2 copies.

## Decision

- NO summon mechanic. Guppy-centric positional play: cards manipulate position, damage, armor, coins, and draw.
- Every card is unique: Strike/Slam (single-target damage), Riptide (AoE), Shell (armor), Patches (heal), Undercurrent (push), Gulp (coins), Borrowed Time (draw 2), Harpoon (pull + Debt stack), Dart (self-move without consuming move action).
- Card effects emit `GameAction` objects (damage_unit, heal_unit, gain_armor, gain_coins, draw_cards, move_unit push/pull, move_self, apply_debt) resolved by an ActionResolver — no raw code per card.
- Bosses (future) are immune to push/pull displacement ("Boss holds ground").

## Rationale

- Unique cards give each draw decision texture without the board-clutter and balance surface of summons.
- Dart exists specifically because future bosses will be strong with AoE — Guppy needs a reposition tool that doesn't cost her move action.
- The Action union keeps the engine pure and testable; the resolver validates against current state and never crashes on dead targets.

## Consequences

- The engine contract (`app/src/engine/contract.ts`) has no summon_unit; GameAction types are the single extension point for future cards.
- Card targeting is per-card (targetMode: none/cell/unit), computed by one `cardTargeting` function — valid-targets single source of truth.
- Deck economy uses FaB-style coins (sell for coinValue, credit −5, interest) — see @wiki/decisions/fab-coin-system.

## Related

- @wiki/specs/js-combat-vertical-slice (D4, D8)
- @wiki/decisions/fab-coin-system
- @wiki/decisions/fab-style-action-card-type (all cards 'action' type)