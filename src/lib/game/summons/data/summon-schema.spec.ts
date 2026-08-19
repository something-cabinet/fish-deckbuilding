/**
 * The summon JSON database is the design tool's storage — it must keep
 * parsing, and the "summon" card effect reads it by id at resolution time.
 */
import { describe, expect, it } from "vitest"

import { SUMMON_DEFS, SUMMON_LIBRARY, DEFAULT_SUMMON, resolveSummon } from "../summon-library"
import { SummonDefSchema, SummonPackSchema } from "./summon-schema.helper"
import summonDb from "./summon-database.json"

const VALID = {
  id: "shrimp",
  name: "Shrimp",
  hp: 3,
  atk: 1,
  move: 3,
  range: 1,
  icon: "goon",
}

describe("summon database", () => {
  it("parses the shipped pack", () => {
    expect(() => SummonPackSchema.parse(summonDb)).not.toThrow()
    expect(SUMMON_DEFS.length).toBeGreaterThan(0)
  })

  it("keys the library by id", () => {
    for (const def of SUMMON_DEFS) {
      expect(SUMMON_LIBRARY[def.id]).toBe(def)
    }
  })

  it("defaults to the first authored summon", () => {
    expect(DEFAULT_SUMMON).toBe(SUMMON_DEFS[0])
  })

  it("resolves an unknown or missing id back to the default", () => {
    expect(resolveSummon("no_such_summon")).toBe(DEFAULT_SUMMON)
    expect(resolveSummon()).toBe(DEFAULT_SUMMON)
    expect(resolveSummon(DEFAULT_SUMMON.id)).toBe(DEFAULT_SUMMON)
  })

  it("accepts a fully authored summon", () => {
    expect(SummonDefSchema.safeParse(VALID).success).toBe(true)
  })

  it("rejects stats that would break the battlefield", () => {
    // 0 HP spawns dead and range 0 could never reach anything
    expect(SummonDefSchema.safeParse({ ...VALID, hp: 0 }).success).toBe(false)
    expect(SummonDefSchema.safeParse({ ...VALID, range: 0 }).success).toBe(false)
  })

  it("rejects a nameless summon", () => {
    expect(SummonDefSchema.safeParse({ ...VALID, name: "" }).success).toBe(false)
  })
})
