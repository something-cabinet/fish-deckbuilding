import { describe, expect, it } from "vitest"
import { createInitialState } from "@/lib/game/battle"
import type { GameState, Pos } from "@/lib/game/battle"
import { CARD_LIBRARY } from "@/lib/game"
import { AimMode, CardTarget, aimMode, aoeTileCount, aoeTiles, cardTargets, unitsInAoe } from "@/lib/game/cards"
import type { CardDef, CardInstance } from "@/lib/game/cards"
import { Team, UnitKind } from "@/lib/game/units"

function board(): GameState {
  return createInitialState({
    cols: 8,
    rows: 6,
    heroStart: { x: 0, y: 0 },
    enemies: [
      { name: "A", kind: UnitKind.Soldier, x: 4, y: 2, hp: 5, atk: 1, move: 1 },
      { name: "B", kind: UnitKind.Soldier, x: 5, y: 2, hp: 5, atk: 1, move: 1 },
      { name: "C", kind: UnitKind.Soldier, x: 4, y: 3, hp: 5, atk: 1, move: 1 },
    ],
  })
}

function withAoe(base: CardDef, aoe: number, target = base.target): CardDef {
  return { ...base, aoe, target, range: 20 }
}

function instance(def: CardDef): CardInstance {
  return { uid: "u1", def }
}

function keys(tiles: Pos[]): string[] {
  return tiles.map((p) => `${p.x},${p.y}`).sort()
}

describe("aoeTileCount", () => {
  it("counts the manhattan diamond of a given radius", () => {
    expect(aoeTileCount(0)).toBe(1)
    expect(aoeTileCount(1)).toBe(5)
    expect(aoeTileCount(2)).toBe(13)
    expect(aoeTileCount(3)).toBe(25)
  })
})

describe("aoeTiles", () => {
  it("returns only the centre at radius 0", () => {
    expect(aoeTiles(board(), { x: 3, y: 3 }, 0)).toEqual([{ x: 3, y: 3 }])
  })

  it("returns the plus shape at radius 1", () => {
    expect(keys(aoeTiles(board(), { x: 3, y: 3 }, 1))).toEqual(
      keys([
        { x: 3, y: 3 },
        { x: 2, y: 3 },
        { x: 4, y: 3 },
        { x: 3, y: 2 },
        { x: 3, y: 4 },
      ]),
    )
  })

  it("clips the diamond to the board edges", () => {
    expect(keys(aoeTiles(board(), { x: 0, y: 0 }, 1))).toEqual(
      keys([
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 0, y: 1 },
      ]),
    )
  })
})

describe("aimMode", () => {
  it("aims at a unit for a single-tile enemy card", () => {
    expect(aimMode(withAoe(CARD_LIBRARY.demand_letter, 0))).toBe(AimMode.Unit)
  })

  it("aims at a tile once the card has any blast radius", () => {
    expect(aimMode(withAoe(CARD_LIBRARY.demand_letter, 1))).toBe(AimMode.Tile)
  })

  it("aims at a tile for empty-tile cards regardless of radius", () => {
    const summonCard = Object.values(CARD_LIBRARY).find((c) => c.target === CardTarget.EmptyTile)!
    expect(aimMode(withAoe(summonCard, 0))).toBe(AimMode.Tile)
  })

  it("aims at nothing for self cards", () => {
    const selfCard = Object.values(CARD_LIBRARY).find((c) => c.target === CardTarget.Self)!
    expect(aimMode(withAoe(selfCard, 0))).toBe(AimMode.None)
  })
})

describe("unitsInAoe", () => {
  it("returns only enemies inside the diamond for an enemy card", () => {
    const s = board()
    const def = withAoe(CARD_LIBRARY.demand_letter, 1, CardTarget.Enemy)
    const hit = unitsInAoe(s, def, { x: 4, y: 2 }).map((u) => u.name).sort()
    expect(hit).toEqual(["A", "B", "C"])
  })

  it("excludes units outside the diamond", () => {
    const s = board()
    const def = withAoe(CARD_LIBRARY.demand_letter, 0, CardTarget.Enemy)
    expect(unitsInAoe(s, def, { x: 4, y: 2 }).map((u) => u.name)).toEqual(["A"])
  })

  it("spares allies when the card only affects enemies", () => {
    const s = board()
    const hero = s.units.find((u) => u.team === Team.Player)!
    hero.pos = { x: 4, y: 1 }
    const def = withAoe(CARD_LIBRARY.demand_letter, 1, CardTarget.Enemy)
    expect(unitsInAoe(s, def, { x: 4, y: 2 }).some((u) => u.team === Team.Player)).toBe(false)
  })

  it("includes both teams for an any-unit card", () => {
    const s = board()
    const hero = s.units.find((u) => u.team === Team.Player)!
    hero.pos = { x: 4, y: 1 }
    const def = withAoe(CARD_LIBRARY.demand_letter, 1, CardTarget.Unit)
    expect(unitsInAoe(s, def, { x: 4, y: 2 }).length).toBe(4)
  })

  it("ignores dead units", () => {
    const s = board()
    s.units.find((u) => u.name === "B")!.hp = 0
    const def = withAoe(CARD_LIBRARY.demand_letter, 1, CardTarget.Enemy)
    expect(unitsInAoe(s, def, { x: 4, y: 2 }).map((u) => u.name).sort()).toEqual(["A", "C"])
  })
})

describe("cardTargets with a blast radius", () => {
  it("offers every in-range tile and no unit targets", () => {
    const s = board()
    const def = withAoe(CARD_LIBRARY.demand_letter, 1, CardTarget.Enemy)
    const t = cardTargets(s, instance(def))
    expect(t.unitIds).toEqual([])
    expect(t.tiles.length).toBe(s.cols * s.rows)
  })

  it("offers occupied tiles too, so a blast can be centred on an enemy", () => {
    const s = board()
    const def = withAoe(CARD_LIBRARY.demand_letter, 1, CardTarget.Enemy)
    const t = cardTargets(s, instance(def))
    expect(t.tiles.some((p) => p.x === 4 && p.y === 2)).toBe(true)
  })

  it("still restricts empty-tile cards to unoccupied tiles", () => {
    const s = board()
    const summonCard = Object.values(CARD_LIBRARY).find((c) => c.target === CardTarget.EmptyTile)!
    const t = cardTargets(s, instance({ ...summonCard, range: 20, aoe: 0 }))
    expect(t.tiles.some((p) => p.x === 4 && p.y === 2)).toBe(false)
  })
})
