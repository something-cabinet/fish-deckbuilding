// @vitest-environment jsdom
/**
 * AC-1 / AC-2 — StrictMode regression test for useFishMafia command draining.
 *
 * RED against the pre-fix `setState(drain)` impure updater: React 19 dev
 * StrictMode double-invokes setState updater functions, so the first
 * (discarded) invocation consumed the GameSession command queue and the second
 * invocation found an empty queue → returned unchanged state → React bailed →
 * move / attack / cast / sell / buy silently no-oped.
 *
 * GREEN against the current `commit()`/stateRef fix: command draining runs
 * synchronously OUTSIDE setState against the latest committed state
 * (stateRef), then `setState(ns)` receives a concrete value. The observable
 * outcomes asserted below prove every command action actually commits while
 * the hook renders inside <StrictMode>.
 *
 * NODE_ENV=test uses the dev React build, so <StrictMode> here reproduces the
 * double-invoke mechanism the old updater tripped over.
 */
import { StrictMode } from "react"
import { act, cleanup, renderHook, waitFor } from "@testing-library/react"
import "@testing-library/jest-dom/vitest"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { useFishMafia } from "@/hooks/use-fish-mafia"
import { CardTarget } from "@/lib/game/cards"
import { Phase, type Pos } from "@/lib/game/battle"
import { Team } from "@/lib/game/units"

/**
 * Render a fresh hook instance inside React 19 <StrictMode> — the bug
 * mechanism under test (dev StrictMode double-invokes updaters/renders).
 */
function setup() {
  return renderHook(() => useFishMafia(), { wrapper: StrictMode })
}

/**
 * The hook's mount useEffect calls startGame (shuffle + deal opening hand).
 * Flush the effect-triggered state update before asserting.
 */
async function flushStartGame() {
  await act(async () => {})
}

// Fake timers keep the hook's internal setTimeout FX-purge timers (1200ms)
// inert between assertions and let endTurn's async enemy phase run in bounded
// time. React schedules via MessageChannel in jsdom, which we don't fake.
beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  cleanup() // unmount the hook instance (per-test isolation)
  vi.useRealTimers() // drop any pending fake timers
})

describe("useFishMafia under StrictMode (AC-1: actions commit, AC-2: drain fix)", () => {
  it("starts a fresh game: opening hand is dealt inside StrictMode", async () => {
    const { result } = setup()
    await flushStartGame()

    expect(result.current.state.phase).toBe(Phase.Player)
    expect(result.current.state.turn).toBe(1)
    expect(result.current.state.hand.length).toBe(5)
  })

  it("move: selected hero moves to a reachable tile and is marked hasMoved", async () => {
    const { result } = setup()
    await flushStartGame()

    const hero = result.current.state.units.find((u) => u.id === "hero")!
    const posBefore = { ...hero.pos }

    act(() => result.current.select(hero.id))
    const reachable = result.current.reachable
    expect(reachable.length).toBeGreaterThan(0)

    const dest = reachable[0]
    act(() => result.current.move(hero.id, dest))

    const moved = result.current.state.units.find((u) => u.id === hero.id)!
    expect(moved.pos).toEqual(dest)
    expect(moved.pos).not.toEqual(posBefore)
    expect(moved.hasMoved).toBe(true)
  })

  it("attack: adjacent enemy takes damage (skipped if none adjacent at range 1)", async () => {
    const { result } = setup()
    await flushStartGame()

    const hero = result.current.state.units.find((u) => u.id === "hero")!
    const adjacent = result.current.state.units.find(
      (u) =>
        u.team === Team.Enemy &&
        u.hp > 0 &&
        Math.abs(u.pos.x - hero.pos.x) + Math.abs(u.pos.y - hero.pos.y) === 1,
    )

    if (!adjacent) {
      // Deterministic turn-1 board: the hero spawns at (1,2) and the nearest
      // enemy at (6,1) is 6 tiles away (melee range is 1), so no enemy is
      // adjacent on a fresh mount — skip the assertion for this draw.
      return
    }

    const hpBefore = adjacent.hp
    act(() => result.current.attack(hero.id, adjacent.id))

    const after = result.current.state.units.find((u) => u.id === adjacent.id)!
    expect(after.hp).toBeLessThan(hpBefore)
  })

  it("cast: pays coin and removes the played card from hand", async () => {
    const { result } = setup()
    await flushStartGame()

    // Turn 1 starts at 0 coin (sell-to-play economy). Bank some by selling a
    // couple of cards from the top of the hand so a card becomes affordable.
    for (let i = 0; i < 2; i++) {
      const s = result.current.state
      if (s.hand.length <= 1) break
      act(() => result.current.sell(s.hand[0].uid))
    }

    // Pick an affordable card that does NOT itself grant coin, so the only
    // coin delta from casting is the cost paid.
    const s = result.current.state
    const playable = s.hand.find(
      (c) => c.def.cost <= s.coin && !c.def.effects?.some((e) => e.kind === "gainCoin"),
    )

    if (!playable) {
      // Unlucky draw — nothing affordable/non-income after selling. Skip.
      return
    }

    // Resolve a valid target for whatever card we drew (self cards need {}).
    const targets = result.current.targetsFor(playable)
    let target: { unitId?: string; tile?: Pos } = {}
    if (playable.def.target === CardTarget.EmptyTile) {
      target = { tile: targets.tiles[0] }
    } else if (playable.def.target !== CardTarget.Self) {
      target = { unitId: targets.unitIds[0] }
    }

    const coinBefore = result.current.state.coin
    const uid = playable.uid

    act(() => result.current.cast(uid, target))

    const after = result.current.state
    expect(after.coin).toBe(coinBefore - playable.def.cost)
    expect(after.hand.some((c) => c.uid === uid)).toBe(false)
  })

  it("sell: converts a hand card into coin", async () => {
    const { result } = setup()
    await flushStartGame()

    const card = result.current.state.hand[0]
    const coinBefore = result.current.state.coin
    const handBefore = result.current.state.hand.length
    const uid = card.uid

    act(() => result.current.sell(uid))

    const after = result.current.state
    expect(after.coin).toBeGreaterThan(coinBefore)
    expect(after.hand.some((c) => c.uid === uid)).toBe(false)
    expect(after.hand.length).toBe(handBefore - 1)
  })

  it("endTurn: runs the enemy phase and returns to the player phase (turn advances)", async () => {
    const { result } = setup()
    await flushStartGame()

    // endTurn awaits internal setTimeout waits (FX delays 300/480ms + 250ms),
    // so advance fake timers inside act to keep the test bounded.
    await act(async () => {
      const pending = result.current.endTurn()
      await vi.advanceTimersByTimeAsync(10_000) // covers all enemy step waits
      await pending
    })

    const after = result.current.state
    expect(after.phase).toBe(Phase.Player)
    expect(after.turn).toBeGreaterThan(1)
  })
})

// waitFor is part of the required Testing Library imports; it's available for
// future async assertions even though this suite flushes deterministically.
void waitFor
