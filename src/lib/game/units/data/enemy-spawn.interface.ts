import type { UnitKind } from "../enums"

export interface EnemySpawn {
  name: string
  kind: UnitKind
  x: number
  y: number
  hp: number
  atk: number
  move: number
}
