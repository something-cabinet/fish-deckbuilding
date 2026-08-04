import { Team, UnitKind } from "../enums"
import type { Unit } from "../models"

export const HERO_DEF: Omit<Unit, "id" | "pos"> = {
  name: "Guppy",
  kind: UnitKind.Hero,
  team: Team.Player,
  hp: 14,
  maxHp: 14,
  atk: 2,
  move: 2,
  range: 1,
  hasMoved: false,
  hasActed: false,
  buffAtk: 0,
}
