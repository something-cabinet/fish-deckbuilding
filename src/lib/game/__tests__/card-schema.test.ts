import { describe, expect, it } from "vitest"
import { CARD_LIBRARY } from "@/lib/game/data"
import {
  CardDefSchema,
  CardEffectSchema,
  CardPackSchema,
} from "@/lib/game/cards/schema"
import type { CardDef, CardEffect } from "@/lib/game/types"

const EXPECTED_IDS = [
  "demand_letter",
  "collection_call",
  "foreclose",
  "kneecap",
  "cash_flow",
  "market_rate",
  "loan_shark",
  "hush_money",
  "muscle",
]

/**
 * Typed helper (AC-16): assigning the schema-parsed output to `CardDef`
 * only compiles if the schema shape matches the TS type.
 */
function parseCardDef(input: unknown): CardDef {
  return CardDefSchema.parse(input)
}

describe("card schema: pack load", () => {
  it("loads the pack and CARD_LIBRARY has all 9 expected ids", () => {
    expect(Object.keys(CARD_LIBRARY).sort()).toEqual([...EXPECTED_IDS].sort())
  })

  it("CARD_LIBRARY.demand_letter.effects deep-equals the TS source data", () => {
    expect(CARD_LIBRARY.demand_letter.effects).toEqual([
      { kind: "damage", amount: 2 },
    ])
  })

  it("parses a full pack through CardPackSchema (the same path data.ts uses)", () => {
    const pack = { cards: Object.values(CARD_LIBRARY) }
    const parsed = CardPackSchema.parse(pack)
    expect(parsed.cards).toHaveLength(EXPECTED_IDS.length)
    expect(parsed.cards.map((c) => c.id).sort()).toEqual([...EXPECTED_IDS].sort())
  })
})

describe("card schema: malformed payloads throw", () => {
  it("rejects an effects entry with an unknown kind", () => {
    expect(() =>
      CardDefSchema.parse({
        ...CARD_LIBRARY.demand_letter,
        effects: [{ kind: "explode", amount: 99 }],
      }),
    ).toThrow()
  })

  it("rejects a card missing a required field (cost)", () => {
    const { cost: _cost, ...noCost } = CARD_LIBRARY.demand_letter
    expect(() => CardDefSchema.parse(noCost)).toThrow()
  })

  it("rejects a pack containing an invalid effect kind via CardPackSchema", () => {
    expect(() =>
      CardPackSchema.parse({
        cards: [
          {
            ...CARD_LIBRARY.demand_letter,
            effects: [{ kind: "nope", amount: 1 }],
          },
        ],
      }),
    ).toThrow()
  })
})

describe("card schema: inferred types are compatible with TS types (AC-16)", () => {
  it("the schema-inferred effect type is assignable to the TS CardEffect union", () => {
    const effect: CardEffect = CardEffectSchema.parse({
      kind: "damage",
      amount: 2,
    })
    expect(effect).toEqual({ kind: "damage", amount: 2 })
  })

  it("the typed helper returns a valid CardDef (compile-time compatibility)", () => {
    const def = parseCardDef(CARD_LIBRARY.demand_letter)
    expect(def.id).toBe("demand_letter")
    expect(def.effects[0].kind).toBe("damage")
  })
})
