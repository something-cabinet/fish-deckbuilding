// @vitest-environment jsdom
/**
 * B1 (engine-reducer-rewrite, Gate 1) — enemy steps must commit to React state
 * MID-loop, not just at the end of the enemy phase.
 *
 * RED against the pre-fix hook: endTurn applied each enemy step to a LOCAL
 * `current` chain and only pushed fx, so the board committed at beginPlayerTurn
 * only — unit tokens froze during the enemy phase then teleported
 * (FR-7/Scenario 3), and fx hit-markers resolved against stale pre-enemy-phase
 * unit positions.
 *
 * GREEN against the fix: each step commits `{ state, fx }` through setHistory,
 * so advancing fake timers one step at a time exposes the intermediate board
 * (moved enemy position / hero HP after an attack) in `result.current.state`
 * while the enemy phase is still running.
 */
import { StrictMode } from "react"
import { act, cleanup, renderHook } from "@testing-library/react"
import "@testing-library/jest-dom/vitest"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { useFishMafia } from "@/hooks/use-fish-mafia"
import {
  EnemyStepKind,
  FxKind,
  Phase,
  createInitialState,
  planEnemyTurn,
} from "@/lib/game/battle"
import { Team } from "@/lib/game/units"

/** Render a fresh hook instance inside React 19 <StrictMode>. */
function setup() {
  return renderHook(() => useFishMafia(), { wrapper: StrictMode })
}

/** Flush the mount effect's startGame (shuffle + deal opening hand). */
async function flushStartGame() {
  await act(async () => {})
}

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  cleanup() // unmount the hook instance (per-test isolation)
  vi.useRealTimers() // drop any pending fake timers
})

describe("useFishMafia enemy phase commits per step (B1, FR-7)", () => {
  it("exposes each enemy step's intermediate state mid-loop, not just the final board", async () => {
    const { result } = setup()
    await flushStartGame()

    // Park exactly one living enemy adjacent to the hero (all others dead) so
    // the planned enemy turn is a short, deterministic set of steps.
    const hero = result.current.state.units.find((u) => u.id === "hero")!
    const keeper = result.current.state.units.find((u) => u.team === Team.Enemy)!
    act(() => {
      result.current.debugUpdate({
        units: result.current.state.units.map((u) => {
          if (u.team !== Team.Enemy) return u
          if (u.id !== keeper.id) return { ...u, hp: 0 }
          return { ...u, pos: { x: hero.pos.x + 1, y: hero.pos.y } }
        }),
      })
    })

    // The plan is deterministic and phase-independent, so preview it to learn
    // what the FIRST step will do to the board.
    const plan = planEnemyTurn(result.current.state)
    expect(plan.length).toBeGreaterThan(0)
    const first = plan[0]
    const enemyPosBefore = { ...keeper.pos }
    const heroHpBefore = result.current.state.units.find((u) => u.id === "hero")!.hp

    let pending: Promise<void> | undefined
    await act(async () => {
      pending = result.current.endTurn()
      // fire endTurn's internal wait(0): the loop applies step 1 and then
      // awaits its pacing delay (300ms move / 480ms attack)
      await vi.advanceTimersByTimeAsync(0)
    })

    // MID-LOOP assertion: step 1's effect is already visible in React state
    // while the enemy phase is still running (phase has not flipped yet).
    expect(result.current.state.phase).toBe(Phase.Enemy)
    if (first.kind === EnemyStepKind.Move) {
      const moved = result.current.state.units.find((u) => u.id === first.unitId)!
      expect(moved.pos).toEqual(first.to)
      expect(moved.pos).not.toEqual(enemyPosBefore)
      expect(result.current.fx.some((e) => e.kind === FxKind.Move)).toBe(true)
    } else {
      const heroNow = result.current.state.units.find((u) => u.id === "hero")!
      expect(heroNow.hp).toBe(heroHpBefore - (first.amount ?? 0))
      expect(result.current.fx.some((e) => e.kind === FxKind.Melee)).toBe(true)
    }

    // Let the enemy phase finish (remaining pacing waits + 250ms settle), then
    // the hook returns to the player phase with the final board committed.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000)
      await pending!
    })
    expect(result.current.state.phase).toBe(Phase.Player)
    expect(result.current.busy).toBe(false)
  })
})
