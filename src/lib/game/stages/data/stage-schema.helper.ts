import { z } from "zod"
import {
  STAGE_MAX_COLS,
  STAGE_MAX_ROWS,
  STAGE_MIN_COLS,
  STAGE_MIN_ROWS,
} from "../constants/stage.constants"
import type { StageDef } from "../models/stage-def.interface"

export const ZoneIdSchema = z.enum(["shallows", "midwaters", "depths"])

export const PosSchema = z.object({
  x: z.number().int().min(0),
  y: z.number().int().min(0),
})

export const StagePlacementSchema = z.object({
  enemyId: z.string().min(1),
  x: z.number().int().min(0),
  y: z.number().int().min(0),
})

export const StageTypeSchema = z.enum(["normal", "elite", "boss"])

export const StageDefSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  zone: ZoneIdSchema,
  cols: z.number().int().min(STAGE_MIN_COLS).max(STAGE_MAX_COLS),
  rows: z.number().int().min(STAGE_MIN_ROWS).max(STAGE_MAX_ROWS),
  type: StageTypeSchema,
  heroStart: PosSchema,
  placements: z.array(StagePlacementSchema),
})

/**
 * Reading is lenient about stages authored before `type` existed: a row with
 * the old `isBossStage` flag is normalised on the way in. Writes always go
 * through StageDefSchema, so the file converges on `type` as stages are saved.
 */
const withLegacyType = z.preprocess((raw) => {
  if (raw && typeof raw === "object" && !("type" in raw) && "isBossStage" in raw) {
    const { isBossStage, ...rest } = raw as Record<string, unknown>
    return { ...rest, type: isBossStage ? "boss" : "normal" }
  }
  return raw
}, StageDefSchema)

export const StagePackSchema = z.object({
  stages: z.array(withLegacyType),
})

export type InferredStageDef = z.infer<typeof StageDefSchema>

type _Equal<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false
const _schemaMatchesType: _Equal<StageDef, InferredStageDef> = true
