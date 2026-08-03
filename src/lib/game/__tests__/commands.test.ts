import { describe, expect, it } from "vitest"
import { CommandQueue, executeCommand } from "@/lib/game/commands"
import { createInitialState, heroUnit, startGame } from "@/lib/game/engine"
import { CARD_LIBRARY } from "@/lib/game/data"
import type { GameState } from "@/lib/game/types"

function fresh(): GameState {
  return createInitialState()
}

/** State with a known hand card and enough mana to cast it. */
function castableState(libId: string): GameState {
  const s = fresh()
  s.hand = [{ uid: "c_cmd", def: CARD_LIBRARY[libId] }]
  s.mana = 10
  s.maxMana = 10
  return s
}

describe("command base: executeCommand", () => {
  it("playCard routes through the same engine function (parity)", () => {
    const s = castableState("demand_letter")
    const enemy = s.units.find((u) => u.team === "enemy" && u.hp > 0)!
    const hpBefore = enemy.hp
    const manaBefore = s.mana

    const r = executeCommand(s, {
      kind: "playCard",
      cardUid: "c_cmd",
      target: { unitId: enemy.id },
    })

    expect(r.state.mana).toBe(manaBefore - 1)
    const after = r.state.units.find((u) => u.id === enemy.id)!
    expect(after.hp).toBe(hpBefore - 2)
  })

  it("move routes through moveUnit", () => {
    const s = fresh()
    const h = heroUnit(s)!
    const r = executeCommand(s, { kind: "move", unitId: h.id, dest: { x: 2, y: 2 } })
    const after = r.state.units.find((u) => u.id === h.id)!
    expect(after.pos).toEqual({ x: 2, y: 2 })
    expect(after.hasMoved).toBe(true)
  })

  it("attack routes through unitAttack", () => {
    const s = fresh()
    const h = heroUnit(s)!
    // move hero adjacent to a Thug at (6,1)? too far — place a unit adjacent instead
    const enemy = s.units.find((u) => u.team === "enemy")!
    h.pos = { x: enemy.pos.x - 1, y: enemy.pos.y } // adjacent
    h.hasMoved = false
    const hpBefore = enemy.hp

    const r = executeCommand(s, { kind: "attack", attackerId: h.id, targetId: enemy.id })

    const after = r.state.units.find((u) => u.id === enemy.id)!
    expect(after.hp).toBe(hpBefore - h.atk)
  })

  it("sell routes through sellCard", () => {
    const s = fresh()
    s.hand = [{ uid: "c_sell", def: CARD_LIBRARY.demand_letter }]
    const coinBefore = s.coin
    const r = executeCommand(s, { kind: "sell", cardUid: "c_sell" })
    expect(r.state.coin).toBe(coinBefore + CARD_LIBRARY.demand_letter.value)
    expect(r.state.hand.length).toBe(0)
  })

  it("buy routes through buyCard", () => {
    const s = fresh()
    s.coin = 10
    const handBefore = s.hand.length
    const deckBefore = s.deck.length
    const r = executeCommand(s, { kind: "buy" })
    expect(r.state.hand.length).toBe(handBefore + 1)
    expect(r.state.deck.length).toBe(deckBefore - 1)
    expect(r.state.coin).toBe(10 - 3)
  })

  it("endTurn transitions to the enemy phase", () => {
    const s = fresh()
    const r = executeCommand(s, { kind: "endTurn" })
    expect(r.state.phase).toBe("enemy")
    expect(r.fx).toEqual([])
  })
})

describe("command queue: deterministic ordered execution (AC-12)", () => {
  it("executes commands in enqueue order", () => {
    const s = castableState("cash_flow")
    const q = new CommandQueue()
    q.enqueue({ kind: "playCard", cardUid: "c_cmd", target: {} }) // +3 coin
    q.enqueue({ kind: "buy" }) // spends 3 coin, draws 1

    const { state } = q.drain(s)

    expect(state.coin).toBe(0 + 3 - 3)
    expect(q.length).toBe(0)
  })

  it("replaying the same sequence against a fresh state yields identical coin/hand", () => {
    const run = () => {
      const s = castableState("cash_flow")
      const q = new CommandQueue()
      q.enqueue({ kind: "playCard", cardUid: "c_cmd", target: {} })
      q.enqueue({ kind: "buy" })
      const { state } = q.drain(s)
      return { coin: state.coin, handLen: state.hand.length, deckLen: state.deck.length }
    }

    expect(run()).toEqual(run())
  })

  it("queue snapshot serializes pending commands (logging/replay seam)", () => {
    const q = new CommandQueue()
    q.enqueue({ kind: "buy" })
    q.enqueue({ kind: "endTurn" })
    expect(q.snapshot()).toEqual([{ kind: "buy" }, { kind: "endTurn" }])
  })

  it("drain leaves the queue empty", () => {
    const q = new CommandQueue()
    q.enqueue({ kind: "buy" })
    q.drain(fresh())
    expect(q.length).toBe(0)
  })
})

describe("command base: startGame consistency", () => {
  it("startGame produces a castable hand and command execution works end-to-end", () => {
    const s = startGame(fresh())
    expect(s.hand.length).toBeGreaterThan(0)
    const r = executeCommand(s, { kind: "sell", cardUid: s.hand[0].uid })
    expect(r.state.hand.length).toBe(s.hand.length - 1)
  })
})
