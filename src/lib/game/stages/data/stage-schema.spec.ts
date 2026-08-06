/**
 * Stage persistence: writes require an explicit type, and reads still accept
 * stages authored before `type` replaced the isBossStage flag.
 */
import { describe, expect, it } from "vitest"

import { StageDefSchema, StagePackSchema } from "./stage-schema.helper"

const base = {
  id: "s1",
  name: "Reef Ambush",
  zone: "shallows",
  cols: 9,
  rows: 5,
  heroStart: { x: 1, y: 2 },
  placements: [{ enemyId: "thug", x: 6, y: 1 }],
}

describe("StageDefSchema", () => {
  it("accepts each stage type", () => {
    for (const type of ["normal", "elite", "boss"]) {
      expect(StageDefSchema.safeParse({ ...base, type }).success).toBe(true)
    }
  })

  it("rejects an unknown type and a missing one", () => {
    expect(StageDefSchema.safeParse({ ...base, type: "miniboss" }).success).toBe(false)
    expect(StageDefSchema.safeParse(base).success).toBe(false)
  })

  it("rejects a grid outside the authoring bounds", () => {
    expect(StageDefSchema.safeParse({ ...base, type: "normal", cols: 40 }).success).toBe(false)
    expect(StageDefSchema.safeParse({ ...base, type: "normal", rows: 1 }).success).toBe(false)
  })
})

describe("StagePackSchema", () => {
  it("normalises pre-type stages that used isBossStage", () => {
    const parsed = StagePackSchema.parse({
      stages: [
        { ...base, id: "old-normal", isBossStage: false },
        { ...base, id: "old-boss", isBossStage: true },
      ],
    })
    expect(parsed.stages.map((s) => s.type)).toEqual(["normal", "boss"])
  })

  it("leaves an explicit type alone", () => {
    const parsed = StagePackSchema.parse({
      stages: [{ ...base, type: "elite", isBossStage: true }],
    })
    expect(parsed.stages[0].type).toBe("elite")
  })
})
