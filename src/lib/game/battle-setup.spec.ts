/**
 * battleSetupForNode: a battle node builds from an authored stage when one
 * matches its zone and kind, and falls back to the built-in lineup otherwise.
 */
import { describe, expect, it } from "vitest"

import { UnitKind, type EnemyDef } from "@/lib/game/units"
import type { StageDef } from "@/lib/game/stages"
import type { NodeType } from "./overworld-types"
import { ZONES } from "./overworld-data"
import {
  battleSetupForNode,
  createNewRun,
  generateZoneMap,
  stageForNode,
  stageTypeForNode,
} from "./overworld-engine"

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
    type: "normal",
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

  it("a standard node never draws from the boss or elite pools", () => {
    const run = createNewRun()
    expect(stageForNode(run, [shallowsStage({ type: "boss" })])).toBeNull()
    expect(stageForNode(run, [shallowsStage({ type: "elite" })])).toBeNull()
  })

  it("picks the same stage every time for a given run and node", () => {
    const run = createNewRun()
    const pool = [shallowsStage({ id: "a" }), shallowsStage({ id: "b" }), shallowsStage({ id: "c" })]
    const first = stageForNode(run, pool)
    expect(first).not.toBeNull()
    expect(stageForNode(run, pool)!.stage.id).toBe(first!.stage.id)
  })

  it("a standard node uses its stage unscaled", () => {
    const run = createNewRun()
    expect(stageForNode(run, [shallowsStage()])!.scaled).toBe(false)
  })
})

/** A run parked on a node of the given kind, searching seeds until one exists. */
function runOnNode(type: NodeType) {
  for (let seed = 1; seed < 200; seed++) {
    const run = createNewRun(seed)
    const node = generateZoneMap(ZONES[run.zoneIndex], run.seed).find((n) => n.type === type)
    if (node) return { ...run, nodeId: node.id }
  }
  throw new Error(`no ${type} node found in any seeded map`)
}

describe("elite nodes", () => {
  it("use an authored elite stage exactly as built", () => {
    const run = runOnNode("elite")
    const elite = shallowsStage({ id: "elite-1", type: "elite" })
    const pick = stageForNode(run, [elite])

    expect(pick).not.toBeNull()
    expect(pick!.stage.id).toBe("elite-1")
    expect(pick!.scaled).toBe(false)
    expect(battleSetupForNode(run, [elite], [thug]).enemies[0]).toMatchObject({
      name: "Thug",
      hp: 10,
    })
  })

  it("borrow and scale a normal stage when no elite is authored", () => {
    const run = runOnNode("elite")
    const normal = shallowsStage({ id: "normal-1" })
    const pick = stageForNode(run, [normal])

    expect(pick!.stage.id).toBe("normal-1")
    expect(pick!.scaled).toBe(true)
    expect(battleSetupForNode(run, [normal], [thug]).enemies[0]).toMatchObject({
      name: "Elite Thug",
      hp: Math.round(10 * 1.6),
    })
  })

  it("prefer the elite pool over the normal one when both exist", () => {
    const run = runOnNode("elite")
    const pool = [shallowsStage({ id: "n" }), shallowsStage({ id: "e", type: "elite" })]
    expect(stageForNode(run, pool)!.stage.id).toBe("e")
  })

  it("never borrow a normal stage for a boss node", () => {
    const run = runOnNode("boss")
    expect(stageForNode(run, [shallowsStage({ id: "n" })])).toBeNull()
  })
})

describe("stageTypeForNode", () => {
  it("maps each combat node to its pool", () => {
    expect(stageTypeForNode("boss")).toBe("boss")
    expect(stageTypeForNode("elite")).toBe("elite")
    expect(stageTypeForNode("battle")).toBe("normal")
    // non-combat nodes never reach a battle, but must not land in a boss pool
    expect(stageTypeForNode("shop")).toBe("normal")
  })
})
