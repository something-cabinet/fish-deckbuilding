import { z } from "zod"
import type { CardDef } from "../models"
import type { CardEffect } from "../models"
import { CardTarget } from "../enums"
import { CardType } from "../enums"
import { FxKind } from "../../battle/enums"

/* ------------------------------------------------------------------ */
/* CardEffect schema — discriminated on "kind"                         */
/*                                                                     */
/* AC-16: the zod union below MUST stay in sync with the TS CardEffect */
/* union in ../types.ts. The `_schemaEffectMatchesTsUnion` const below */
/* makes any drift a compile error instead of a silent runtime one.   */
/* ------------------------------------------------------------------ */

export const CardEffectSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("damage"), amount: z.number() }),
  z.object({
    kind: z.literal("heal"),
    amount: z.number(),
    target: z.enum(["caster", "cast-target"]),
  }),
  z.object({ kind: z.literal("drawCards"), amount: z.number() }),
  z.object({ kind: z.literal("gainCoin"), amount: z.number() }),
  z.object({ kind: z.literal("buffAtk"), amount: z.number() }),
  z.object({ kind: z.literal("summon"), unit: z.literal("goon") }),
  z.object({ kind: z.literal("custom"), handlerId: z.string() }),
])

export type InferredCardEffect = z.infer<typeof CardEffectSchema>

/** True iff A and B are mutually assignable (exact type equality). */
type _Equal<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false

/** Compile-time drift guard: schema effect type must exactly match the TS union. */
const _schemaEffectMatchesTsUnion: _Equal<CardEffect, InferredCardEffect> = true

/* ------------------------------------------------------------------ */
/* CardDef schema                                                      */
/*                                                                     */
/* CardType / CardTarget / FxKind are string-valued enums whose values */
/* must equal the strings in pack-01-starter.json; nativeEnum keeps    */
/* the schema inferred type identical to the TS enum (AC-16).          */
/* ------------------------------------------------------------------ */

export const CardTypeSchema = z.nativeEnum(CardType)
export const CardTargetSchema = z.nativeEnum(CardTarget)
export const CardFxSchema = z.nativeEnum(FxKind)

export const CardDefSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: CardTypeSchema,
  cost: z.number(),
  value: z.number(),
  target: CardTargetSchema,
  desc: z.string(),
  icon: z.string(),
  fx: CardFxSchema,
  effects: z.array(CardEffectSchema),
  log: z.string(),
  logTone: z.enum(["neutral", "good", "bad", "gold"]),
})

export type InferredCardDef = z.infer<typeof CardDefSchema>

/** Compile-time drift guard: schema card shape must exactly match CardDef. */
const _schemaCardMatchesTsCard: _Equal<CardDef, InferredCardDef> = true

/* ------------------------------------------------------------------ */
/* CardPack schema                                                     */
/* ------------------------------------------------------------------ */

export const CardPackSchema = z.object({
  cards: z.array(CardDefSchema),
})

export type InferredCardPack = z.infer<typeof CardPackSchema>
