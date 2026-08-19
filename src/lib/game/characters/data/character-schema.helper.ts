import { z } from "zod"
import type { CharacterDef, CharacterStats } from "../character-def.model"

/** True iff A and B are mutually assignable (exact type equality). */
type _Equal<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false

export const CharacterStatsSchema = z.object({
  maxHp: z.number().int().min(1),
  atk: z.number().int().min(0),
  move: z.number().int().min(1),
})

export type InferredCharacterStats = z.infer<typeof CharacterStatsSchema>

/** Compile-time drift guard: schema shape must exactly match CharacterStats. */
const _schemaStatsMatchesTsStats: _Equal<CharacterStats, InferredCharacterStats> = true

export const CharacterDefSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  title: z.string(),
  description: z.string(),
  icon: z.string().min(1),
  stats: CharacterStatsSchema,
  starterDeck: z.array(z.string().min(1)),
})

export type InferredCharacterDef = z.infer<typeof CharacterDefSchema>

/** Compile-time drift guard: schema shape must exactly match CharacterDef. */
const _schemaCharacterMatchesTsCharacter: _Equal<CharacterDef, InferredCharacterDef> = true

export const CharacterPackSchema = z.object({
  characters: z.array(CharacterDefSchema),
})

export type InferredCharacterPack = z.infer<typeof CharacterPackSchema>
