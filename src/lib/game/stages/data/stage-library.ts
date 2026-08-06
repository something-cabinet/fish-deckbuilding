import { StagePackSchema } from "./stage-schema.helper"
import type { StageDef } from "../models/stage-def.interface"
import stageDb from "./stage-database.json"

/**
 * Authored stages ship as a JSON database validated at module load, matching
 * how cards and enemies are loaded. A malformed entry throws here rather than
 * failing halfway through building a battle.
 */
export const STAGE_LIBRARY: StageDef[] = StagePackSchema.parse(stageDb).stages
