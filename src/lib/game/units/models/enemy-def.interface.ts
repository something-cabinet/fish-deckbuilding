import type { UnitKind } from "../enums/unit-kind.enum"

export interface EnemyDef {
  id: string
  name: string
  kind: UnitKind
  hp: number
  atk: number
  move: number
  range: number
  goldDrop: number
  isMinion: boolean
  icon: string
  deck: { id: string; count: number }[]
}