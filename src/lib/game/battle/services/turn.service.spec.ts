import { describe, expect, it } from "vitest"
import { createInitialState, Phase, type FxEvent, type GameState } from "@/lib/game/battle"
import { COIN_TURN_BASE } from "@/lib/game/cards"
import { Team } from "@/lib/game/units"
import {
  EnemyStepKind,
  applyEnemyStep,
  beginPlayerTurn,
  checkEnd,
  planEnemyTurn,
  startEnemyPhase,
} from "@/lib/game/battle"

function fresh(): GameState {
  return createInitialState()
}

describe("turn: checkEnd", () => {
  it("sets Lost when the hero dies", () => {
    const s = fresh()
    const hero = s.units.find((u) => u.id === "hero")!
    hero.hp = 0
    checkEnd(s)
    expect(s.phase).toBe(Phase.Lost)
  })

  it("sets Won when all enemies are dead", () => {
    const s = fresh()
    for (const u of s.units) if (u.team === Team.Enemy) u.hp = 0
    checkEnd(s)
    expect(s.phase).toBe(Phase.Won)
  })

  it("sets Lost when the foreclosure clock hits zero", () => {
    const s = fresh()
    s.foreclosure = 0
    checkEnd(s)
    expect(s.phase).toBe(Phase.Lost)
  })

  it("leaves the phase unchanged while the battle is live", () => {
    const s = fresh()
    checkEnd(s)
    expect(s.phase).toBe(Phase.Player)
  })
})

describe("turn: enemy phase", () => {
  it("startEnemyPhase transitions to Enemy", () => {
    const s = startEnemyPhase(fresh())
    expect(s.phase).toBe(Phase.Enemy)
  })

  it("planEnemyTurn produces move and attack steps for living enemies", () => {
    const s = fresh()
    const steps = planEnemyTurn(s)
    // enemies are far from the hero at (1,2); each plans a move step; the
    // closest may also attack once adjacent
    expect(steps.length).toBeGreaterThan(0)
    expect(steps.every((st) => st.kind === EnemyStepKind.Move || st.kind === EnemyStepKind.Attack)).toBe(true)
  })

  it("applyEnemyStep move relocates the unit", () => {
    const s = fresh()
    const enemy = s.units.find((u) => u.team === Team.Enemy)!
    const dest = { x: enemy.pos.x + 1, y: enemy.pos.y }
    const fx: FxEvent[] = []
    const { state } = applyEnemyStep(s, { kind: EnemyStepKind.Move, unitId: enemy.id, to: dest })
    const moved = state.units.find((u) => u.id === enemy.id)!
    expect(moved.pos).toEqual(dest)
  })

  it("applyEnemyStep attack damages the target", () => {
    const s = fresh()
    const enemy = s.units.find((u) => u.team === Team.Enemy)!
    const hero = s.units.find((u) => u.id === "hero")!
    const hpBefore = hero.hp
    const { state } = applyEnemyStep(s, {
      kind: EnemyStepKind.Attack,
      unitId: enemy.id,
      targetId: hero.id,
      amount: enemy.atk,
      to: hero.pos,
    })
    const after = state.units.find((u) => u.id === "hero")!
    expect(after.hp).toBeLessThan(hpBefore)
  })
})

describe("turn: beginPlayerTurn", () => {
  it("increments turn, resets coin and spentCount, draws a card", () => {
    const s = fresh()
    s.spentCount = 3
    const turnBefore = s.turn
    const handBefore = s.hand.length
    const next = beginPlayerTurn(s)
    expect(next.turn).toBe(turnBefore + 1)
    expect(next.spentCount).toBe(0)
    expect(next.coin).toBe(COIN_TURN_BASE)
    expect(next.hand.length).toBeGreaterThan(handBefore)
    expect(next.phase).toBe(Phase.Player)
  })

  it("returns early when the battle is already decided", () => {
    const s = fresh()
    s.phase = Phase.Won
    const turnBefore = s.turn
    const next = beginPlayerTurn(s)
    expect(next.phase).toBe(Phase.Won)
    expect(next.turn).toBe(turnBefore)
  })
})
