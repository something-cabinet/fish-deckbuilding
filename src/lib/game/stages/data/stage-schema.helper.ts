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

export const StageDefSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  zone: ZoneIdSchema,
  cols: z.number().int().min(STAGE_MIN_COLS).max(STAGE_MAX_COLS),
  rows: z.number().int().min(STAGE_MIN_ROWS).max(STAGE_MAX_ROWS),
  isBossStage: z.boolean(),
  heroStart: PosSchema,
  placements: z.array(StagePlacementSchema),
})

export const StagePackSchema = z.object({
  stages: z.array(StageDefSchema),
})

export type InferredStageDef = z.infer<typeof StageDefSchema>

type _Equal<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false
const _schemaMatchesType: _Equal<StageDef, InferredStageDef> = true
