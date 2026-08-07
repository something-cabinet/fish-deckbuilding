import { z } from "zod"
import { AiArchetype } from "../enums/ai-archetype.enum"
import { AiScorer } from "../enums/ai-scorer.enum"
import { UnitKind } from "../enums/unit-kind.enum"
import type { EnemyDef } from "../models/enemy-def.interface"

export const EnemyDeckEntrySchema = z.object({
  id: z.string(),
  count: z.number().int().min(1),
})

/** partialRecord, not record: designers override individual scorers only */
export const EnemyAiProfileSchema = z.object({
  archetype: z.nativeEnum(AiArchetype),
  weights: z.partialRecord(z.nativeEnum(AiScorer), z.number()).optional(),
})

export const EnemyDefSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  kind: z.nativeEnum(UnitKind),
  hp: z.number().int().min(1),
  atk: z.number().int().min(0),
  move: z.number().int().min(0),
  range: z.number().int().min(1),
  goldDrop: z.number().int().min(0),
  isMinion: z.boolean(),
  icon: z.string(),
  deck: z.array(EnemyDeckEntrySchema),
  aiProfile: EnemyAiProfileSchema.optional(),
})

export const EnemyPackSchema = z.object({
  enemies: z.array(EnemyDefSchema),
})

export type InferredEnemyDef = z.infer<typeof EnemyDefSchema>

type _Equal<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false
const _schemaMatchesType: _Equal<EnemyDef, InferredEnemyDef> = true