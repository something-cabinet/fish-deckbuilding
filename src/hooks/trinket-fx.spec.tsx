// @vitest-environment jsdom
/**
 * AC-4 / AC-5 (engine-reducer-rewrite) — trinket trigger fx events reach the
 * hook's fx queue and are rendered to the UI.
 *
 * RED against the current engine (`src/lib/game/actions/actions.service.ts`):
 *   sellCard() builds an `fx: FxEvent[]`, resolves `onCardSold` trinket
 *   triggers into it (state.coin is mutated by the trigger), then RETURNS
 *   bare `GameState` — the fx array is discarded. `commands.service.ts`
 *   completes the drop with `return { state: sellCard(...), fx: [] }`, so the
 *   hook's `pushFx` receives nothing and the UI never sees the trinket's coin
 *   event.
 *
 * GREEN against the rewritten engine: every action returns `{ state, fx }`
 * (FR-2) and sellCard threads the trinket fx through (FR-5, AC-4); the hook
 * surfaces it in `fx`.
 *
 * Trinket used: `gold_pinky_ring` (onCardSold → gainCoin 2) from
 * `src/lib/game/trinkets/data/trinket-database.json`. It has NO
 * `onCombatStart` trigger, so the mount-time startGame emits no competing fx
 * and the fx queue stays clean until the sell.
 */
import { StrictMode } from "react"
import { act, cleanup, renderHook } from "@testing-library/react"
import "@testing-library/jest-dom/vitest"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { useFishMafia } from "@/hooks/use-fish-mafia"
import { createInitialState, FxKind } from "@/lib/game/battle"

const ON_CARD_SOLD_TRINKET = "gold_pinky_ring" // onCardSold → gainCoin 2
const TRINKET_COIN = 2

/** Render a fresh hook instance inside React 19 <StrictMode>. */
function setup() {
  const initial = createInitialState({ trinkets: [ON_CARD_SOLD_TRINKET] })
  return renderHook(() => useFishMafia(initial), { wrapper: StrictMode })
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

describe("useFishMafia trinket fx (AC-4/AC-5: onCardSold reaches the UI)", () => {
  it("selling a card with an onCardSold trinket emits a coin fx event in the hook fx queue", async () => {
    const { result } = setup()
    await flushStartGame()

    // The trinket must be active and a hand dealt before selling.
    expect(result.current.state.activeTrinkets).toContain(ON_CARD_SOLD_TRINKET)
    expect(result.current.state.hand.length).toBeGreaterThan(0)
    // Mount-time startGame (onCombatStart) must not have emitted competing fx.
    expect(result.current.fx).toHaveLength(0)

    const cardUid = result.current.state.hand[0].uid
    const coinBefore = result.current.state.coin

    // Sell → the trinket trigger resolves into the action's fx array.
    act(() => result.current.sell(cardUid))

    // State effect (already live today) — sanity only, not the discriminator.
    expect(result.current.state.coin).toBeGreaterThan(coinBefore)

    // AC-4: the trinket's coin fx must be in the hook's fx queue. The current
    // engine drops it (sellCard returns bare GameState) → RED.
    const coinFx = result.current.fx.find((e) => e.kind === FxKind.Coin)
    expect(coinFx).toBeDefined()
    expect(coinFx!.amount).toBe(TRINKET_COIN)
  })
})
