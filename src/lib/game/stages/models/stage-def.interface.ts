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
 * Which kind of node draws a stage. Each zone keeps three separate pools, so a
 * boss node never rolls a standard lineup and an elite never rolls a boss.
 */
export type StageType = "normal" | "elite" | "boss"

export const STAGE_TYPES: StageType[] = ["normal", "elite", "boss"]

/**
 * An authored battle layout: a grid of a given size with enemies placed on it.
 * A battle node draws at random from the pool matching its zone and type.
 */
export interface StageDef {
  id: string
  name: string
  zone: ZoneId
  cols: number
  rows: number
  type: StageType
  /** where the hero spawns; kept on the stage so small grids stay valid */
  heroStart: Pos
  placements: StagePlacement[]
}
