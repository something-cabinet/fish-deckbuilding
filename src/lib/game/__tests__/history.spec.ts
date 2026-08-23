import { describe, expect, it } from "vitest"
import { createInitialState } from "@/lib/game/battle"
import {
  historyReducer,
  redoHistory,
  undoHistory,
  type HistoryBundle,
} from "@/lib/game/actions"
import { heroUnit } from "@/lib/game/shared"
import { CARD_LIBRARY } from "@/lib/game"
import { Phase, applyEnemyStep, EnemyStepKind, type EnemyStep, type GameState } from "@/lib/game/battle"
import { Team } from "@/lib/game/units"

function fresh(): GameState {
  const s = createInitialState()
  s.hand = [{ uid: "c_h", def: CARD_LIBRARY.demand_letter }]
  s.coin = 10
  return s
}

function bundle(s: GameState): HistoryBundle {
  return { state: s, past: [], future: [] }
}

function enemyOf(s: GameState) {
  return s.units.find((u) => u.team === Team.Enemy && u.hp > 0)!
}

describe("history: snapshot round-trip per action (D2)", () => {
  it("playCard → undo restores the exact pre-action state", () => {
    const b = bundle(fresh())
    const enemy = enemyOf(b.state)
    heroUnit(b.state)!.pos = { x: enemy.pos.x - 1, y: enemy.pos.y } // within cast range
    const target = { unitId: enemy.id }

    const after = historyReducer(b, { kind: "playCard", cardUid: "c_h", target })
    expect(after.state.coin).toBe(b.state.coin - 1)
    expect(after.state.units.find((u) => u.id === enemy.id)!.hp).toBe(enemy.hp - 2)

    const undone = undoHistory(after)
    expect(undone.state.coin).toBe(b.state.coin)
    expect(undone.state.hand.length).toBe(b.state.hand.length)
    expect(undone.state.units.find((u) => u.id === enemy.id)!.hp).toBe(enemy.hp)
    expect(undone.state.log.length).toBe(b.state.log.length)
  })

  it("move → undo restores previous tile and hasMoved flag", () => {
    const b = bundle(fresh())
    const h = heroUnit(b.state)!
    const before = h.pos

    const after = historyReducer(b, { kind: "move", unitId: h.id, dest: { x: 2, y: 2 } })
    expect(after.state.units.find((u) => u.id === h.id)!.pos).toEqual({ x: 2, y: 2 })

    const undone = undoHistory(after)
    const hAfter = undone.state.units.find((u) => u.id === h.id)!
    expect(hAfter.pos).toEqual(before)
    expect(hAfter.hasMoved).toBe(false)
  })

  it("sell → undo restores coin and hand", () => {
    const b = bundle(fresh())
    b.state.coin = 10
    const handBefore = b.state.hand.length

    const after = historyReducer(b, { kind: "sell", cardUid: "c_h" })
    expect(after.state.coin).toBeGreaterThan(10)
    expect(after.state.hand.length).toBe(handBefore - 1)

    const undone = undoHistory(after)
    expect(undone.state.coin).toBe(10)
    expect(undone.state.hand.length).toBe(handBefore)
  })
})

describe("history: undo semantics (AC-7)", () => {
  it("undo repeatedly walks back through the player phase", () => {
    let b = bundle(fresh())
    const h = heroUnit(b.state)!

    // two moves: (1,2) → (2,2) → (3,2) — reset hasMoved between moves
    b = historyReducer(b, { kind: "move", unitId: h.id, dest: { x: 2, y: 2 } })
    const h1 = b.state.units.find((u) => u.id === h.id)!
    h1.hasMoved = false
    b = historyReducer(b, { kind: "move", unitId: h.id, dest: { x: 3, y: 2 } })
    expect(b.state.units.find((u) => u.id === h.id)!.pos).toEqual({ x: 3, y: 2 })

    const u1 = undoHistory(b)
    expect(u1.state.units.find((u) => u.id === h.id)!.pos).toEqual({ x: 2, y: 2 })
    const u2 = undoHistory(u1)
    expect(u2.state.units.find((u) => u.id === h.id)!.pos).toEqual(
      fresh().units.find((u) => u.id === h.id)!.pos,
    )
  })

  it("new action after undo discards the redo tail", () => {
    let b = bundle(fresh())
    const h = heroUnit(b.state)!

    b = historyReducer(b, { kind: "move", unitId: h.id, dest: { x: 2, y: 2 } })
    const undone = undoHistory(b)

    // act differently after undo — (3,2) is within hero move range 2
    const after = historyReducer(undone, { kind: "move", unitId: h.id, dest: { x: 3, y: 2 } })
    expect(after.state.units.find((u) => u.id === h.id)!.pos).toEqual({ x: 3, y: 2 })

    // redo of the discarded action must be impossible
    const redone = redoHistory(after)
    expect(redone.future).toEqual([])
    expect(redone.state).toBe(after.state) // no-op, nothing to redo
  })

  it("redo re-applies after undo when no new action intervened", () => {
    const b = bundle(fresh())
    const h = heroUnit(b.state)!

    const s1 = historyReducer(b, { kind: "move", unitId: h.id, dest: { x: 2, y: 2 } })
    const undone = undoHistory(s1)
    expect(undone.state.units.find((u) => u.id === h.id)!.pos).not.toEqual({ x: 2, y: 2 })

    const redone = redoHistory(undone)
    expect(redone.state.units.find((u) => u.id === h.id)!.pos).toEqual({ x: 2, y: 2 })
  })
})

describe("history: end turn commits (D10, AC-7)", () => {
  it("endTurn clears the history; enemy steps never enter the undo stack", () => {
    let b = bundle(fresh())
    const h = heroUnit(b.state)!

    b = historyReducer(b, { kind: "move", unitId: h.id, dest: { x: 2, y: 2 } })
    expect(b.past.length).toBe(1)

    // end turn executes through the reducer but commits (clears history)
    const after = historyReducer(b, { kind: "endTurn" })
    expect(after.state.phase).toBe(Phase.Enemy)

    // after commit, nothing can be undone into the previous player phase
    expect(after.past).toEqual([])
    expect(after.future).toEqual([])
    const undone = undoHistory(after)
    expect(undone.state).toBe(after.state)
    expect(undone.past).toEqual([])
  })
})

describe("history: enemy steps never enter the bundle (D6)", () => {
  it("applying an enemy step on a committed bundle leaves past/future untouched", () => {
    let b = bundle(fresh())
    const h = heroUnit(b.state)!

    // build a bundle with a non-empty undo stack (committed after endTurn)
    b = historyReducer(b, { kind: "move", unitId: h.id, dest: { x: 2, y: 2 } })
    expect(b.past).toHaveLength(1)
    const committed: HistoryBundle = { state: b.state, past: b.past, future: b.future }

    // an enemy step applied directly on top of the bundle's state is not a
    // player action, so it must not push anything onto past or future
    const enemy = enemyOf(committed.state)
    const hero = heroUnit(committed.state)!
    const step: EnemyStep = {
      kind: EnemyStepKind.Attack,
      unitId: enemy.id,
      targetId: hero.id,
      amount: 1,
    }
    const { state: stepped, fx } = applyEnemyStep(committed.state, step)

    // the step really ran (state mutated) — this test would be vacuous if the
    // step were never applied, which is exactly what the old version did
    expect(stepped.units.find((u) => u.id === hero.id)!.hp).toBeLessThan(hero.hp)
    expect(fx.length).toBeGreaterThan(0)
    expect(committed.past).toHaveLength(1) // untouched
    expect(committed.future).toHaveLength(0) // untouched
  })
})
