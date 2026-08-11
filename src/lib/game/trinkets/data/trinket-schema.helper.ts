import { z } from "zod"
import { CardEffectSchema } from "../../cards/data/schema.helper"
import type { TrinketDef } from "../trinket-def.model"

/** True iff A and B are mutually assignable (exact type equality). */
type _Equal<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false

export const TrinketRaritySchema = z.enum(["common", "uncommon", "rare"])

export const TrinketTriggerSchema = z.enum([
  "onCombatStart",
  "onTurnStart",
  "onCardSold",
  "onEnemyKilled",
])

export const TrinketStatsSchema = z.object({
  maxHp: z.number().int().optional(),
  atk: z.number().int().optional(),
  move: z.number().int().optional(),
})

export const TrinketDefSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string(),
  icon: z.string().min(1),
  rarity: TrinketRaritySchema,
  stats: TrinketStatsSchema.optional(),
  triggers: z.partialRecord(TrinketTriggerSchema, z.array(CardEffectSchema)).optional(),
})

export type InferredTrinketDef = z.infer<typeof TrinketDefSchema>

/** Compile-time drift guard: schema shape must exactly match TrinketDef. */
const _schemaTrinketMatchesTsTrinket: _Equal<TrinketDef, InferredTrinketDef> = true

export const TrinketPackSchema = z.object({
  trinkets: z.array(TrinketDefSchema),
})

export type InferredTrinketPack = z.infer<typeof TrinketPackSchema>
