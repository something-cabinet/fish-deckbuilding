import { DEFAULT_CHARACTER, type CharacterDef } from "../../characters"
import { Team, UnitKind } from "../enums"
import type { Unit } from "../models"

/** Battle unit template for a playable character (stats come from its def). */
export function heroDefFromCharacter(def: CharacterDef): Omit<Unit, "id" | "pos"> {
  return {
    name: def.name,
    kind: UnitKind.Hero,
    team: Team.Player,
    hp: def.stats.maxHp,
    maxHp: def.stats.maxHp,
    atk: def.stats.atk,
    move: def.stats.move,
    range: 1,
    icon: def.icon,
    hasMoved: false,
    hasActed: false,
    buffAtk: 0,
  }
}

/** The hero as authored on the default character — used when none is chosen. */
export const HERO_DEF: Omit<Unit, "id" | "pos"> = heroDefFromCharacter(DEFAULT_CHARACTER)
