import { z } from "zod"
import type { SummonDef } from "../summon-def.model"
import { AiArchetype } from "../../units/enums/ai-archetype.enum"

const AiProfileSchema = z.object({
  archetype: z.nativeEnum(AiArchetype),
  weights: z.record(z.string(), z.number()).optional(),
})

export const SummonDefSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  hp: z.number().int().min(1),
  atk: z.number().int().min(0),
  move: z.number().int().min(0),
  range: z.number().int().min(1),
  icon: z.string().min(1),
  aiProfile: AiProfileSchema.optional(),
})

export type InferredSummonDef = z.infer<typeof SummonDefSchema>

export const SummonPackSchema = z.object({
  summons: z.array(SummonDefSchema),
})

export type InferredSummonPack = z.infer<typeof SummonPackSchema>