import { describe, expect, it } from "vitest"
import { createInitialState } from "@/lib/game/battle"
import type { GameState } from "@/lib/game/battle"
import { castCard } from "@/lib/game"
import { CARD_LIBRARY } from "@/lib/game"
import { CardTarget } from "@/lib/game/cards"
import type { CardDef } from "@/lib/game/cards"
import { UnitKind } from "@/lib/game/units"

function board(def: CardDef): GameState {
  const s = createInitialState({
    cols: 8,
    rows: 6,
    heroStart: { x: 3, y: 2 },
    enemies: [
      { name: "A", kind: UnitKind.Soldier, x: 5, y: 2, hp: 9, atk: 1, move: 1 },
      { name: "B", kind: UnitKind.Soldier, x: 6, y: 2, hp: 9, atk: 1, move: 1 },
      { name: "C", kind: UnitKind.Soldier, x: 5, y: 3, hp: 9, atk: 1, move: 1 },
      { name: "D", kind: UnitKind.Soldier, x: 0, y: 5, hp: 9, atk: 1, move: 1 },
    ],
  })
  return { ...s, coin: 10, hand: [{ uid: "blast", def }] }
}

function blastCard(aoe: number): CardDef {
  return { ...CARD_LIBRARY.demand_letter, id: "blast", range: 9, aoe, target: CardTarget.Enemy }
}

function hp(s: GameState, name: string): number {
  return s.units.find((u) => u.name === name)?.hp ?? 0
}

describe("casting a card with a blast radius", () => {
  it("damages every enemy in the diamond from a tile centre", () => {
    const def = blastCard(1)
    const { state } = castCard(board(def), "blast", { tile: { x: 5, y: 2 } })
    expect(hp(state, "A")).toBe(7)
    expect(hp(state, "B")).toBe(7)
    expect(hp(state, "C")).toBe(7)
  })

  it("leaves enemies outside the diamond untouched", () => {
    const def = blastCard(1)
    const { state } = castCard(board(def), "blast", { tile: { x: 5, y: 2 } })
    expect(hp(state, "D")).toBe(9)
  })

  it("hits multiple enemies when centred on an empty tile between them", () => {
    const def = blastCard(1)
    const { state } = castCard(board(def), "blast", { tile: { x: 5, y: 2 } })
    const damaged = state.units.filter((u) => u.hp < u.maxHp && u.name !== "hero")
    expect(damaged.length).toBe(3)
  })

  it("resolves as a legal but empty cast when the blast catches nobody", () => {
    const def = blastCard(1)
    const before = board(def)
    const { state } = castCard(before, "blast", { tile: { x: 2, y: 0 } })
    expect(state.hand.length).toBe(0)
    expect(state.coin).toBe(before.coin - def.cost)
  })

  it("rejects a tile outside cast range", () => {
    const def = { ...blastCard(1), range: 1 }
    const before = board(def)
    const { state } = castCard(before, "blast", { tile: { x: 7, y: 5 } })
    expect(state.hand.length).toBe(1)
    expect(state.coin).toBe(before.coin)
  })

  it("rejects a unit-id target for a blast card, which aims at tiles", () => {
    const def = blastCard(1)
    const before = board(def)
    const enemyId = before.units.find((u) => u.name === "A")!.id
    const { state } = castCard(before, "blast", { unitId: enemyId })
    expect(state.hand.length).toBe(1)
  })

  it("keeps single-target casts working unchanged", () => {
    const def = blastCard(0)
    const before = board(def)
    const enemyId = before.units.find((u) => u.name === "A")!.id
    const { state } = castCard(before, "blast", { unitId: enemyId })
    expect(hp(state, "A")).toBe(7)
    expect(hp(state, "B")).toBe(9)
  })

  it("names every unit it hit in the resolution log", () => {
    const def = { ...blastCard(1), log: "Blast hits {target}." }
    const { state } = castCard(board(def), "blast", { tile: { x: 5, y: 2 } })
    const last = state.log[state.log.length - 1].text
    expect(last).toContain("A")
    expect(last).toContain("B")
    expect(last).toContain("C")
  })
})
