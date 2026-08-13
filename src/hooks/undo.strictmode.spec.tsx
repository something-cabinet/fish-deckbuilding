// @vitest-environment jsdom
/**
 * AC-2 (engine-reducer-rewrite) — one undo() click pops exactly one history
 * step under React 19 dev StrictMode.
 *
 * RED against the current hook (`src/hooks/use-fish-mafia.ts`):
 *   undo()  → setState((s) => sessionRef.current.undo(s) ?? s)
 *   redo()  → setState((s) => sessionRef.current.redo(s) ?? s)
 * both MUTATE the shared GameSession past/future stacks inside the setState
 * updater. StrictMode double-invokes updater functions in development, so the
 * first (discarded) invocation pops one snapshot and the committed second
 * invocation pops another — one undo click walks back TWO actions, and redo
 * entries are duplicated.
 *
 * GREEN against the rewritten hook: undo/redo are pure functions of state
 * (`undo(s)`/`redo(s)` over history held in state). A double-invoked pure
 * updater computes the same result both times, so one click restores exactly
 * one prior snapshot and redo re-applies actions one at a time in order.
 *
 * Action pair under test: move the hero (observable: unit pos + hasMoved),
 * then sell a hand card (observable: coin + hand length). After ONE undo the
 * state must match the post-move/pre-sell snapshot — the sell is reverted but
 * the move is NOT — which is exactly the one-step semantic the double-pop bug
 * violates.
 */
import { StrictMode } from "react"
import { act, cleanup, renderHook } from "@testing-library/react"
import "@testing-library/jest-dom/vitest"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { useFishMafia } from "@/hooks/use-fish-mafia"
import type { GameState, Pos } from "@/lib/game/battle"

/** Render a fresh hook instance inside React 19 <StrictMode>. */
function setup() {
  return renderHook(() => useFishMafia(), { wrapper: StrictMode })
}

/** Flush the mount effect's startGame (shuffle + deal opening hand). */
async function flushStartGame() {
  await act(async () => {})
}

/** The observable state fields the assertions discriminate on. */
type Snap = {
  heroPos: Pos
  hasMoved: boolean
  handLen: number
  coin: number
}

function snap(s: GameState): Snap {
  const hero = s.units.find((u) => u.id === "hero")!
  return { heroPos: { ...hero.pos }, hasMoved: hero.hasMoved, handLen: s.hand.length, coin: s.coin }
}

// Fake timers keep the hook's internal 1200ms FX-purge timers inert between
// assertions (same convention as use-fish-mafia.strictmode.spec.tsx).
beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  cleanup() // unmount the hook instance (per-test isolation)
  vi.useRealTimers() // drop any pending fake timers
})

describe("useFishMafia undo under StrictMode (AC-2: one step per click)", () => {
  it("one undo() after move+sell restores exactly the one-action-back state, redo re-applies in order", async () => {
    const { result } = setup()
    await flushStartGame()

    // s0 — fresh game state after the opening hand is dealt.
    const s0 = snap(result.current.state)

    // Action 1: move the hero to a reachable tile.
    const hero = result.current.state.units.find((u) => u.id === "hero")!
    act(() => result.current.select(hero.id))
    const reachable = result.current.reachable
    expect(reachable.length).toBeGreaterThan(0)
    const dest = reachable[0]
    act(() => result.current.move(hero.id, dest))

    // s1 — post-move, PRE-sell snapshot (the "one-action-back" target).
    const s1 = snap(result.current.state)
    expect(s1.heroPos).toEqual(dest) // sanity: the move committed
    expect(s1.hasMoved).toBe(true)

    // Action 2: sell the top hand card for coin.
    const cardUid = result.current.state.hand[0].uid
    const coinBeforeSell = result.current.state.coin
    act(() => result.current.sell(cardUid))

    // s2 — post-move + post-sell.
    const s2 = snap(result.current.state)
    expect(s2.handLen).toBe(s1.handLen - 1)
    expect(s2.coin).toBeGreaterThan(coinBeforeSell)
    expect(s2.heroPos).toEqual(s1.heroPos) // the move survives the sell

    // undo() ONCE: exactly one step back → s1 (move applied, sell reverted).
    // Buggy hook (double-pop): lands on s0 (both actions undone) → RED.
    act(() => result.current.undo())
    const u1 = snap(result.current.state)
    expect(u1).toEqual(s1)
    expect(u1.heroPos).toEqual(dest) // the move is NOT undone
    expect(u1.hasMoved).toBe(true)
    expect(u1.handLen).toBe(s1.handLen) // only the sell is undone
    expect(u1.coin).toBe(s1.coin)

    // undo() again: pre-both-actions (s0).
    act(() => result.current.undo())
    const u2 = snap(result.current.state)
    expect(u2).toEqual(s0)
    expect(u2.heroPos).not.toEqual(dest)
    expect(u2.hasMoved).toBe(false)
    expect(u2.coin).toBe(s0.coin)

    // Two consecutive undo() clicks produce two DISTINCT intermediate states.
    // The double-pop bug collapses both clicks onto the same state → RED.
    expect(u1).not.toEqual(u2)

    // redo() re-applies the actions one at a time, in order: s1 then s2.
    act(() => result.current.redo())
    const r1 = snap(result.current.state)
    expect(r1).toEqual(s1)

    act(() => result.current.redo())
    const r2 = snap(result.current.state)
    expect(r2).toEqual(s2)
  })
})
