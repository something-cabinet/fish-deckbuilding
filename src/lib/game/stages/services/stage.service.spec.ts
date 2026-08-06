/**
 * Stage selection and spawn resolution: the pool splits on isBossStage, the
 * pick is a pure function of the seed, and placements resolve against enemy
 * templates by id.
 */
import { describe, expect, it } from "vitest"

import { UnitKind, type EnemyDef } from "@/lib/game/units"
import { ELITE_SCALE, pickStage, stageToSpawns, stagesFor } from "./stage.service"
import type { StageDef } from "../models/stage-def.interface"

const thug: EnemyDef = {
  id: "thug",
  name: "Thug",
  kind: UnitKind.Thug,
  hp: 10,
  atk: 2,
  move: 2,
  range: 1,
  goldDrop: 5,
  isMinion: false,
  icon: "thug",
  deck: [],
}

const sniper: EnemyDef = { ...thug, id: "sniper", name: "Sniper", range: 2, hp: 4 }

function stage(over: Partial<StageDef> = {}): StageDef {
  return {
    id: "s1",
    name: "Stage 1",
    zone: "shallows",
    cols: 9,
    rows: 5,
    isBossStage: false,
    heroStart: { x: 1, y: 2 },
    placements: [{ enemyId: "thug", x: 6, y: 1 }],
    ...over,
  }
}

describe("stagesFor", () => {
  it("splits the pool by zone and boss flag", () => {
    const all = [
      stage({ id: "a", zone: "shallows", isBossStage: false }),
      stage({ id: "b", zone: "shallows", isBossStage: true }),
      stage({ id: "c", zone: "depths", isBossStage: false }),
    ]
    expect(stagesFor(all, "shallows", false).map((s) => s.id)).toEqual(["a"])
    expect(stagesFor(all, "shallows", true).map((s) => s.id)).toEqual(["b"])
    expect(stagesFor(all, "midwaters", false)).toEqual([])
  })
})

describe("pickStage", () => {
  const pool = [
    stage({ id: "a" }),
    stage({ id: "b" }),
    stage({ id: "c" }),
  ]

  it("returns null when nothing matches", () => {
    expect(pickStage([], "shallows", false, 1)).toBeNull()
    expect(pickStage(pool, "shallows", true, 1)).toBeNull()
  })

  it("is deterministic for a given seed", () => {
    const first = pickStage(pool, "shallows", false, 12345)
    const again = pickStage(pool, "shallows", false, 12345)
    expect(first).not.toBeNull()
    expect(again!.id).toBe(first!.id)
  })

  it("spreads across the pool as the seed changes", () => {
    const ids = new Set(
      [0, 1, 2, 3, 4, 5].map((n) => pickStage(pool, "shallows", false, n)!.id),
    )
    expect(ids.size).toBeGreaterThan(1)
  })

  it("handles negative seeds without going out of range", () => {
    expect(pickStage(pool, "shallows", false, -7)).not.toBeNull()
  })
})

describe("stageToSpawns", () => {
  it("resolves placements against enemy templates, carrying range through", () => {
    const s = stage({
      placements: [
        { enemyId: "thug", x: 6, y: 1 },
        { enemyId: "sniper", x: 7, y: 3 },
      ],
    })
    const spawns = stageToSpawns(s, [thug, sniper])
    expect(spawns).toHaveLength(2)
    expect(spawns[0]).toMatchObject({ name: "Thug", x: 6, y: 1, hp: 10, atk: 2 })
    expect(spawns[1]).toMatchObject({ name: "Sniper", range: 2, hp: 4 })
  })

  it("picks up edits to the template it references", () => {
    const s = stage()
    const buffed = { ...thug, hp: 99 }
    expect(stageToSpawns(s, [buffed])[0].hp).toBe(99)
  })

  it("drops unknown ids rather than throwing", () => {
    const s = stage({ placements: [{ enemyId: "ghost", x: 1, y: 1 }] })
    expect(stageToSpawns(s, [thug])).toEqual([])
  })

  it("drops placements that fall outside the grid", () => {
    const s = stage({ cols: 4, rows: 3, placements: [{ enemyId: "thug", x: 8, y: 1 }] })
    expect(stageToSpawns(s, [thug])).toEqual([])
  })

  it("scales hp and atk for elite nodes", () => {
    const spawns = stageToSpawns(stage(), [thug], { elite: true })
    expect(spawns[0].hp).toBe(Math.round(10 * ELITE_SCALE))
    expect(spawns[0].atk).toBe(Math.round(2 * ELITE_SCALE))
    expect(spawns[0].name).toBe("Elite Thug")
  })
})
