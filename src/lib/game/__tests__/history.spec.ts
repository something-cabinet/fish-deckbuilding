import { describe, expect, it } from "vitest"
import { createInitialState } from "@/lib/game/battle"
import { GameSession } from "@/lib/game"
import { heroUnit } from "@/lib/game/shared"
import { CARD_LIBRARY } from "@/lib/game"
import { Phase, type GameState } from "@/lib/game/battle"
import { Team } from "@/lib/game/units"

function fresh(): GameState {
  const s = createInitialState()
  s.hand = [{ uid: "c_h", def: CARD_LIBRARY.demand_letter }]
  s.mana = 10
  s.maxMana = 10
  return s
}

function enemyOf(s: GameState) {
  return s.units.find((u) => u.team === Team.Enemy && u.hp > 0)!
}

describe("history: snapshot round-trip per action (AC-9)", () => {
  it("playCard → undo restores the exact pre-action state", () => {
    const session = new GameSession()
    const s = fresh()
    const enemy = enemyOf(s)
    const target = { unitId: enemy.id }

    const { state: after } = session.execute(s, {
      kind: "playCard",
      cardUid: "c_h",
      target,
    })
    expect(after.mana).toBe(s.mana - 1)
    expect(after.units.find((u) => u.id === enemy.id)!.hp).toBe(enemy.hp - 2)

    const undone = session.undo(after)
    expect(undone).toBeDefined()
    expect(undone!.mana).toBe(s.mana)
    expect(undone!.hand.length).toBe(s.hand.length)
    expect(undone!.units.find((u) => u.id === enemy.id)!.hp).toBe(enemy.hp)
    expect(undone!.log.length).toBe(s.log.length)
  })

  it("move → undo restores previous tile and hasMoved flag", () => {
    const session = new GameSession()
    const s = fresh()
    const h = heroUnit(s)!
    const before = h.pos

    const { state: after } = session.execute(s, {
      kind: "move",
      unitId: h.id,
      dest: { x: 2, y: 2 },
    })
    expect(after.units.find((u) => u.id === h.id)!.pos).toEqual({ x: 2, y: 2 })

    const undone = session.undo(after)!
    const hAfter = undone.units.find((u) => u.id === h.id)!
    expect(hAfter.pos).toEqual(before)
    expect(hAfter.hasMoved).toBe(false)
  })

  it("buy → undo restores coin and hand", () => {
    const session = new GameSession()
    const s = fresh()
    s.coin = 10
    const handBefore = s.hand.length

    const { state: after } = session.execute(s, { kind: "buy" })
    expect(after.coin).toBe(7)
    expect(after.hand.length).toBe(handBefore + 1)

    const undone = session.undo(after)!
    expect(undone.coin).toBe(10)
    expect(undone.hand.length).toBe(handBefore)
  })
})

describe("history: undo semantics (AC-10)", () => {
  it("undo repeatedly walks back through the player phase", () => {
    const session = new GameSession()
    let s = fresh()
    const h = heroUnit(s)!

    // two moves: (1,2) → (2,2) → (3,2) — reset hasMoved between moves
    const { state: s1 } = session.execute(s, { kind: "move", unitId: h.id, dest: { x: 2, y: 2 } })
    const h1 = s1.units.find((u) => u.id === h.id)!
    h1.hasMoved = false
    const { state: s2 } = session.execute(s1, { kind: "move", unitId: h.id, dest: { x: 3, y: 2 } })
    expect(s2.units.find((u) => u.id === h.id)!.pos).toEqual({ x: 3, y: 2 })

    const u1 = session.undo(s2)!
    expect(u1.units.find((u) => u.id === h.id)!.pos).toEqual({ x: 2, y: 2 })
    const u2 = session.undo(u1)!
    expect(u2.units.find((u) => u.id === h.id)!.pos).toEqual(s.units.find((u) => u.id === h.id)!.pos)
  })

  it("new action after undo discards the redo tail", () => {
    const session = new GameSession()
    let s = fresh()
    const h = heroUnit(s)!

    const { state: s1 } = session.execute(s, { kind: "move", unitId: h.id, dest: { x: 2, y: 2 } })
    const undone = session.undo(s1)!

    // act differently after undo — (3,2) is within hero move range 2
    const { state: s2 } = session.execute(undone, { kind: "move", unitId: h.id, dest: { x: 3, y: 2 } })
    expect(s2.units.find((u) => u.id === h.id)!.pos).toEqual({ x: 3, y: 2 })

    // redo of the discarded action must be impossible
    const redo = session.redo(s2)
    expect(redo).toBeUndefined()
  })

  it("redo re-applies after undo when no new action intervened", () => {
    const session = new GameSession()
    const s = fresh()
    const h = heroUnit(s)!

    const { state: s1 } = session.execute(s, { kind: "move", unitId: h.id, dest: { x: 2, y: 2 } })
    const undone = session.undo(s1)!
    expect(undone.units.find((u) => u.id === h.id)!.pos).not.toEqual({ x: 2, y: 2 })

    const redone = session.redo(undone)!
    expect(redone.units.find((u) => u.id === h.id)!.pos).toEqual({ x: 2, y: 2 })
  })
})

describe("history: end turn commits (D10, AC-11)", () => {
  it("endTurn clears the history; enemy steps never enter the undo stack", () => {
    const session = new GameSession()
    const s = fresh()
    const h = heroUnit(s)!

    const { state: s1 } = session.execute(s, { kind: "move", unitId: h.id, dest: { x: 2, y: 2 } })
    expect(session.canUndo).toBe(true)

    // end turn executes through the command base but clears history
    const { state: after } = session.execute(s1, { kind: "endTurn" })
    expect(after.phase).toBe(Phase.Enemy)

    // after commit, nothing can be undone into the previous player phase
    expect(session.canUndo).toBe(false)
    expect(session.undo(after)).toBeUndefined()
  })
})
