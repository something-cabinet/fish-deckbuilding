import type { UnitKind } from "../enums"

export interface EnemySpawn {
  name: string
  kind: UnitKind
  x: number
  y: number
  hp: number
  atk: number
  move: number
  /** attack range from the enemy template; defaults to 1 (melee) */
  range?: number
}
