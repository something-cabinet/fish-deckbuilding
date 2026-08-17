/**
 * The character JSON database is the design tool's storage — it must keep
 * parsing, and the run/battle setup reads the first entry as the default hero.
 */
import { describe, expect, it } from "vitest"

import {
  CHARACTER_DEFS,
  CHARACTER_LIBRARY,
  DEFAULT_CHARACTER,
  resolveCharacter,
} from "../character-library"
import { CharacterDefSchema, CharacterPackSchema } from "./character-schema.helper"
import characterDb from "./character-database.json"

const VALID = {
  id: "shark_enforcer",
  name: "Bruno",
  title: "The Enforcer",
  description: "Hits hard, swims slow.",
  icon: "thug",
  stats: { maxHp: 20, atk: 4, move: 1 },
  starterDeck: ["kneecap", "kneecap"],
}

describe("character database", () => {
  it("parses the shipped pack", () => {
    expect(() => CharacterPackSchema.parse(characterDb)).not.toThrow()
    expect(CHARACTER_DEFS.length).toBeGreaterThan(0)
  })

  it("keys the library by id", () => {
    for (const def of CHARACTER_DEFS) {
      expect(CHARACTER_LIBRARY[def.id]).toBe(def)
    }
  })

  it("defaults to the first authored character", () => {
    expect(DEFAULT_CHARACTER).toBe(CHARACTER_DEFS[0])
  })

  it("resolves an unknown or missing id back to the default", () => {
    expect(resolveCharacter("no_such_character")).toBe(DEFAULT_CHARACTER)
    expect(resolveCharacter()).toBe(DEFAULT_CHARACTER)
    expect(resolveCharacter(DEFAULT_CHARACTER.id)).toBe(DEFAULT_CHARACTER)
  })

  it("accepts a fully authored character", () => {
    expect(CharacterDefSchema.safeParse(VALID).success).toBe(true)
  })

  it("rejects stats that would break the board", () => {
    // 0 HP is dead on spawn and 0 move can never leave the start tile
    expect(CharacterDefSchema.safeParse({ ...VALID, stats: { ...VALID.stats, maxHp: 0 } }).success).toBe(
      false,
    )
    expect(CharacterDefSchema.safeParse({ ...VALID, stats: { ...VALID.stats, move: 0 } }).success).toBe(
      false,
    )
  })

  it("allows an empty starter deck but not a nameless character", () => {
    expect(CharacterDefSchema.safeParse({ ...VALID, starterDeck: [] }).success).toBe(true)
    expect(CharacterDefSchema.safeParse({ ...VALID, name: "" }).success).toBe(false)
  })
})
