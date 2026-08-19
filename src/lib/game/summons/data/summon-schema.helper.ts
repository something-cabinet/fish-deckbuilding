import { z } from "zod"
import type { SummonDef } from "../summon-def.model"

/** True iff A and B are mutually assignable (exact type equality). */
type _Equal<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false

export const SummonDefSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  hp: z.number().int().min(1),
  atk: z.number().int().min(0),
  move: z.number().int().min(0),
  range: z.number().int().min(1),
  icon: z.string().min(1),
})

export type InferredSummonDef = z.infer<typeof SummonDefSchema>

/** Compile-time drift guard: schema shape must exactly match SummonDef. */
const _schemaSummonMatchesTsSummon: _Equal<SummonDef, InferredSummonDef> = true

export const SummonPackSchema = z.object({
  summons: z.array(SummonDefSchema),
})

export type InferredSummonPack = z.infer<typeof SummonPackSchema>
