import { describe, expect, it } from "vitest"
import { AiArchetype, AiScorer, UnitKind } from "../enums"
import { EnemyDefSchema } from "./enemy-schema.helper"
import { ENEMY_LIBRARY } from "./enemy-library"

const base = {
  id: "test_thug",
  name: "Thug",
  kind: UnitKind.Thug,
  hp: 4,
  atk: 2,
  move: 2,
  range: 1,
  goldDrop: 5,
  isMinion: false,
  icon: "thug",
  deck: [],
}

describe("enemy schema: aiProfile", () => {
  it("accepts a template with no aiProfile — every shipped enemy is one", () => {
    expect(EnemyDefSchema.parse(base).aiProfile).toBeUndefined()
    expect(ENEMY_LIBRARY.length).toBeGreaterThan(0)
  })

  it("accepts an archetype with no overrides", () => {
    const parsed = EnemyDefSchema.parse({
      ...base,
      aiProfile: { archetype: AiArchetype.Artillery },
    })
    expect(parsed.aiProfile?.archetype).toBe(AiArchetype.Artillery)
  })

  it("accepts a partial weight override without demanding every scorer", () => {
    const parsed = EnemyDefSchema.parse({
      ...base,
      aiProfile: {
        archetype: AiArchetype.Skirmisher,
        weights: { [AiScorer.SelfPreservation]: 8 },
      },
    })
    expect(parsed.aiProfile?.weights).toEqual({ [AiScorer.SelfPreservation]: 8 })
  })

  it("rejects an unknown archetype or scorer key", () => {
    expect(() => EnemyDefSchema.parse({ ...base, aiProfile: { archetype: "coward" } })).toThrow()
    expect(() =>
      EnemyDefSchema.parse({
        ...base,
        aiProfile: { archetype: AiArchetype.Brawler, weights: { vibes: 3 } },
      }),
    ).toThrow()
  })
})
