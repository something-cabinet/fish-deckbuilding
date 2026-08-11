/**
 * The trinket JSON database is the design tool's storage — it must keep
 * parsing, and every trigger it names must be one the service resolves.
 */
import { describe, expect, it } from "vitest"

import { TRINKET_DEFS, TRINKET_LIBRARY } from "../trinket-library"
import { TrinketDefSchema, TrinketPackSchema } from "./trinket-schema.helper"
import trinketDb from "./trinket-database.json"

describe("trinket database", () => {
  it("parses the shipped pack", () => {
    expect(() => TrinketPackSchema.parse(trinketDb)).not.toThrow()
    expect(TRINKET_DEFS.length).toBeGreaterThan(0)
  })

  it("keys the library by id", () => {
    for (const def of TRINKET_DEFS) {
      expect(TRINKET_LIBRARY[def.id]).toBe(def)
    }
  })

  it("rejects an unknown trigger name", () => {
    const result = TrinketDefSchema.safeParse({
      id: "bad",
      name: "Bad",
      description: "",
      icon: "Gem",
      rarity: "common",
      triggers: { onSneeze: [{ kind: "gainCoin", amount: 1 }] },
    })
    expect(result.success).toBe(false)
  })

  it("accepts a stats-only trinket", () => {
    const result = TrinketDefSchema.safeParse({
      id: "plate",
      name: "Plate",
      description: "+2 max HP.",
      icon: "Shield",
      rarity: "rare",
      stats: { maxHp: 2 },
    })
    expect(result.success).toBe(true)
  })
})
