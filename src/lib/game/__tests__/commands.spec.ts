import { describe, expect, it } from "vitest"
import { createInitialState, startGame } from "@/lib/game/battle"
import { reduce, historyReducer, type HistoryBundle } from "@/lib/game/actions"
import { heroUnit } from "@/lib/game/shared"
import { CARD_LIBRARY } from "@/lib/game"
import { clone } from "@/lib/game/shared"
import { Phase, type GameState } from "@/lib/game/battle"
import { Team } from "@/lib/game/units"

function fresh(): GameState {
  return createInitialState()
}

/** State with a known hand card and enough coin to cast it. */
function castableState(libId: string): GameState {
  const s = fresh()
  s.hand = [{ uid: "c_cmd", def: CARD_LIBRARY[libId] }]
  s.coin = 10
  return s
}

describe("reducer: reduce dispatches to the pure action functions (D1)", () => {
  it("playCard routes through the same engine function (parity)", () => {
    const s = castableState("demand_letter")
    const enemy = s.units.find((u) => u.team === Team.Enemy && u.hp > 0)!
    const hpBefore = enemy.hp
    const coinBefore = s.coin

    const r = reduce(s, { kind: "playCard", cardUid: "c_cmd", target: { unitId: enemy.id } })

    expect(r.state.coin).toBe(coinBefore - 1)
    const after = r.state.units.find((u) => u.id === enemy.id)!
    expect(after.hp).toBe(hpBefore - 2)
  })

  it("move routes through moveUnit", () => {
    const s = fresh()
    const h = heroUnit(s)!
    const r = reduce(s, { kind: "move", unitId: h.id, dest: { x: 2, y: 2 } })
    const after = r.state.units.find((u) => u.id === h.id)!
    expect(after.pos).toEqual({ x: 2, y: 2 })
    expect(after.hasMoved).toBe(true)
  })

  it("attack routes through unitAttack", () => {
    const s = fresh()
    const h = heroUnit(s)!
    const enemy = s.units.find((u) => u.team === Team.Enemy)!
    h.pos = { x: enemy.pos.x - 1, y: enemy.pos.y } // adjacent
    h.hasMoved = false
    const hpBefore = enemy.hp

    const r = reduce(s, { kind: "attack", attackerId: h.id, targetId: enemy.id })

    const after = r.state.units.find((u) => u.id === enemy.id)!
    expect(after.hp).toBe(hpBefore - h.atk)
  })

  it("sell routes through sellCard", () => {
    const s = fresh()
    s.hand = [{ uid: "c_sell", def: CARD_LIBRARY.demand_letter }]
    const coinBefore = s.coin
    const r = reduce(s, { kind: "sell", cardUid: "c_sell" })
    expect(r.state.coin).toBe(coinBefore + CARD_LIBRARY.demand_letter.value)
    expect(r.state.hand.length).toBe(0)
  })

  it("sell routes through sellCard (banks coin, discards the card)", () => {
    const s = castableState("cash_flow")
    s.coin = 0
    const handBefore = s.hand.length
    const r = reduce(s, { kind: "sell", cardUid: "c_cmd" })
    expect(r.state.hand.length).toBe(handBefore - 1)
    expect(r.state.coin).toBeGreaterThan(0)
  })

  it("endTurn transitions to the enemy phase", () => {
    const s = fresh()
    const r = reduce(s, { kind: "endTurn" })
    expect(r.state.phase).toBe(Phase.Enemy)
    expect(r.fx).toEqual([])
  })
})

describe("reducer: deterministic ordered execution (AC-6)", () => {
  it("applies a sequence of actions in order", () => {
    let s = castableState("cash_flow") // coin 10, hand [cash_flow]
    let r = reduce(s, { kind: "playCard", cardUid: "c_cmd", target: {} }) // pay 1, gain 3
    s = r.state
    expect(s.hand.some((c) => c.uid === "c_cmd")).toBe(false)
    r = reduce(s, { kind: "endTurn" }) // then hand over to the enemy phase
    expect(r.state.phase).toBe(Phase.Enemy)
  })

  it("replaying the same sequence against a fresh state yields identical coin/hand", () => {
    const run = () => {
      let s = castableState("cash_flow")
      let r = reduce(s, { kind: "playCard", cardUid: "c_cmd", target: {} })
      s = r.state
      r = reduce(s, { kind: "sell", cardUid: "c_cmd" }) // no-op after play — order still deterministic
      return { coin: s.coin, handLen: s.hand.length, deckLen: s.deck.length }
    }

    expect(run()).toEqual(run())
  })

  it("same (state, action) sequence on fresh clones yields identical final states (AC-6)", () => {
    const run = (s: GameState) => {
      let st = s
      let r = reduce(st, { kind: "playCard", cardUid: "c_cmd", target: {} })
      st = r.state
      const h = heroUnit(st)!
      r = reduce(st, { kind: "move", unitId: h.id, dest: { x: 2, y: 2 } })
      st = r.state
      r = reduce(st, { kind: "endTurn" })
      return r.state
    }

    const a = run(clone(castableState("cash_flow")))
    const b = run(clone(castableState("cash_flow")))
    expect(a).toEqual(b)
  })

  it("every fx event in a single action carries a unique id (AC-3)", () => {
    // kneecap emits two Shock fx (card fx + dealDamage) in one action
    const s = castableState("kneecap")
    const enemy = s.units.find((u) => u.team === Team.Enemy && u.hp > 0)!
    const r = reduce(s, { kind: "playCard", cardUid: "c_cmd", target: { unitId: enemy.id } })
    expect(r.fx.length).toBeGreaterThan(1)
    const ids = r.fx.map((e) => e.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})

describe("reducer: startGame consistency", () => {
  it("startGame produces a castable hand and reduce works end-to-end", () => {
    const { state } = startGame(fresh())
    expect(state.hand.length).toBeGreaterThan(0)
    const r = reduce(state, { kind: "sell", cardUid: state.hand[0].uid })
    expect(r.state.hand.length).toBe(state.hand.length - 1)
  })
})

describe("reducer: historyReducer keeps the same (state, action) semantics (AC-7)", () => {
  it("historyReducer returns fx alongside the new bundle", () => {
    const b: HistoryBundle = { state: castableState("cash_flow"), past: [], future: [] }
    const r = historyReducer(b, { kind: "playCard", cardUid: "c_cmd", target: {} })
    expect(r.fx.length).toBeGreaterThan(0)
    expect(r.past).toHaveLength(1) // pre-action snapshot pushed for undo
  })
})
