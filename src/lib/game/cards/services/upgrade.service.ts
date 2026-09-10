import type { CardDef, CardEffect } from "../models"

/**
 * Deck-wide card upgrades bought with Fin (spec D11).
 *
 * `applyCardUpgrade` returns a deep clone of a CardDef with every numeric
 * effect amount boosted by `level` — damage and heals scale, coin/draw amounts
 * stay flat so the economy can't be (ab)used — and the sell value follows so an
 * upgraded card is worth selling. The card name gets a " +N" marker and the
 * description is refreshed to match, so the upgraded state is visible on the
 * card face itself (the same surface the player already reads).
 *
 * A level of 0 is a pass-through clone: untouched cards never deviate from
 * their authored definition.
 */
export function applyCardUpgrade(def: CardDef, level: number): CardDef {
  if (level <= 0) return def

  const bump = (e: CardEffect): CardEffect => {
    if (e.kind === "damage" || e.kind === "heal") {
      return { ...e, amount: e.amount + level }
    }
    return e
  }

  return {
    ...def,
    name: `${def.name} +${level}`,
    value: def.value + level,
    desc: def.desc,
    effects: def.effects.map(bump),
  }
}