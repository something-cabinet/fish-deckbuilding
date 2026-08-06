/**
 * battleSetupForNode: a battle node builds from an authored stage when one
 * matches its zone and kind, and falls back to the built-in lineup otherwise.
 */
import { describe, expect, it } from "vitest"

import { UnitKind, type EnemyDef } from "@/lib/game/units"
import type { StageDef } from "@/lib/game/stages"
import { battleSetupForNode, createNewRun, stageForNode } from "./overworld-engine"

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

function shallowsStage(over: Partial<StageDef> = {}): StageDef {
  return {
    id: "reef",
    name: "Reef Ambush",
    zone: "shallows",
    cols: 7,
    rows: 4,
    isBossStage: false,
    heroStart: { x: 0, y: 3 },
    placements: [{ enemyId: "thug", x: 5, y: 1 }],
    ...over,
  }
}

describe("battleSetupForNode", () => {
  it("falls back to the built-in lineup when no stage matches", () => {
    const run = createNewRun()
    const setup = battleSetupForNode(run, [], [thug])

    expect(setup.enemies.length).toBeGreaterThan(0)
    // no stage means no geometry override — the battle keeps the 9x5 default
    expect(setup.cols).toBeUndefined()
    expect(setup.rows).toBeUndefined()
    expect(setup.heroStart).toBeUndefined()
  })

  it("builds from a matching stage, carrying its geometry", () => {
    const run = createNewRun()
    const setup = battleSetupForNode(run, [shallowsStage()], [thug])

    expect(setup.cols).toBe(7)
    expect(setup.rows).toBe(4)
    expect(setup.heroStart).toEqual({ x: 0, y: 3 })
    expect(setup.enemies).toEqual([
      expect.objectContaining({ name: "Thug", x: 5, y: 1, hp: 10 }),
    ])
  })

  it("reflects the enemy template's current stats", () => {
    const run = createNewRun()
    const buffed = { ...thug, hp: 42 }
    const setup = battleSetupForNode(run, [shallowsStage()], [buffed])
    expect(setup.enemies[0].hp).toBe(42)
  })

  it("ignores stages authored for another zone", () => {
    const run = createNewRun()
    const elsewhere = shallowsStage({ zone: "depths" })
    expect(stageForNode(run, [elsewhere])).toBeNull()
  })

  it("a standard node never draws from the boss pool", () => {
    const run = createNewRun()
    const bossOnly = shallowsStage({ isBossStage: true })
    expect(stageForNode(run, [bossOnly])).toBeNull()
  })

  it("picks the same stage every time for a given run and node", () => {
    const run = createNewRun()
    const pool = [shallowsStage({ id: "a" }), shallowsStage({ id: "b" }), shallowsStage({ id: "c" })]
    const first = stageForNode(run, pool)
    expect(first).not.toBeNull()
    expect(stageForNode(run, pool)!.id).toBe(first!.id)
  })
})
