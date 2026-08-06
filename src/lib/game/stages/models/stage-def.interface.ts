import type { Pos } from "../../battle/models"
import type { ZoneId } from "../../overworld-types"

/** One enemy placed on a stage grid, referencing an EnemyDef by id. */
export interface StagePlacement {
  /** EnemyDef id from enemy-database.json */
  enemyId: string
  x: number
  y: number
}

/**
 * An authored battle layout: a grid of a given size with enemies placed on it.
 * Battle nodes draw a stage at random from their zone's pool — `isBossStage`
 * splits that pool, so boss nodes never roll a standard lineup and vice versa.
 */
export interface StageDef {
  id: string
  name: string
  zone: ZoneId
  cols: number
  rows: number
  isBossStage: boolean
  /** where the hero spawns; kept on the stage so small grids stay valid */
  heroStart: Pos
  placements: StagePlacement[]
}
