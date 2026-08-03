import type { Pos } from "../battle"
import type { Team } from "./team.model"
import type { UnitKind } from "./unit-kind.model"

export interface Unit {
  id: string
  name: string
  kind: UnitKind
  team: Team
  pos: Pos
  hp: number
  maxHp: number
  atk: number
  move: number
  range: number // basic attack range (1 = melee)
  hasMoved: boolean
  hasActed: boolean
  buffAtk: number
}
