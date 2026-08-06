// @vitest-environment jsdom
/**
 * AC-3 regression guard: FishMafiaGame must render and play correctly under
 * React StrictMode.
 *
 * The bug under test: command-drain ran inside an impure setState updater,
 * which React StrictMode double-invokes in development. The first (discarded)
 * invocation consumed the queued command, so the second produced a no-op and
 * player actions silently failed. The fix lives in src/hooks/use-fish-mafia.ts
 * (commands are drained synchronously against a ref, outside updaters). This
 * suite renders the real component under <StrictMode> and drives real clicks:
 * if the drain fix regresses, the move / cast assertions below time out.
 *
 * Robustness to randomness:
 * - The opening hand is dealt by a mount effect from a shuffled deck, so we
 *   wait for cards to appear instead of assuming exact contents.
 * - Turn 1 starts at 0 Coin (sell-to-play economy), so the cast test first
 *   sells two cards to bank Coin, then scans the remaining hand for the first
 *   card whose displayed cost <= current Coin. If the unlucky remainder has
 *   nothing affordable, the test logs a note and returns early rather than
 *   failing (the move test remains the StrictMode drain guard).
 *
 * jsdom shims (required by components that render inside the game):
 * - HTMLCanvasElement.getContext("2d") returns null in jsdom (no canvas npm
 *   package) — ParticleCanvas needs a no-op 2D context.
 * - ResizeObserver is not implemented in jsdom — ParticleCanvas constructs one.
 * - Element.scrollTo is not implemented in jsdom — SidePanel scrolls the log
 *   on mount.
 */
import "@testing-library/jest-dom/vitest"
import { act, cleanup, fireEvent, screen, waitFor } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

import { installJsdomShims, renderGame } from "./test-utils"

installJsdomShims()

afterEach(cleanup)

/* ------------------------------------------------------------------ */
/* helpers                                                            */
/* ------------------------------------------------------------------ */

/** Wait for the mount effect to shuffle + deal the opening hand. */
async function flushDeal(container: HTMLElement) {
  await waitFor(() => {
    expect(container.querySelectorAll("[data-card-uid]").length).toBeGreaterThan(0)
  })
  expect(screen.getByText(/Guppy the Debtor/i)).toBeInTheDocument()
}

/** Coin value shown in the bottom-bar register (via its accessible label). */
function readCoin(): number {
  const reg = screen.getByRole("status", { name: /coin available this turn/i })
  const m = (reg.getAttribute("aria-label") ?? "").match(/^(\d+)/)
  return m ? Number(m[1]) : Number.NaN
}

/** "Thug at G2, 4 of 4 health" -> 4 */
function parseHp(label: string | null): number {
  const m = label?.match(/, (\d+) of \d+ health$/)
  return m ? Number(m[1]) : -1
}

/* ------------------------------------------------------------------ */
/* tests                                                              */
/* ------------------------------------------------------------------ */

describe("FishMafiaGame under StrictMode (AC-3)", () => {
  it("deals the hand and moves the hero to a reachable tile", async () => {
    const { container } = renderGame()
    await flushDeal(container)

    // hero spawns at B3 (col B, row 3)
    const hero = screen.getByRole("button", { name: /Guppy at B3/ })
    expect(hero.getAttribute("aria-label")).toMatch(/Guppy at B3, 14 of 14 health/)

    // select the hero -> reveals teal reachable tiles
    act(() => {
      fireEvent.click(hero)
    })
    const reachableTile = container.querySelector('[data-drop="tile"][class*=bg-teal]')
    expect(reachableTile).not.toBeNull()

    // click a reachable tile -> hero moves off B3
    act(() => {
      fireEvent.click(reachableTile as Element)
    })
    await waitFor(() => {
      const moved = screen.getByRole("button", { name: /Guppy at/ })
      expect(moved.getAttribute("aria-label")).toMatch(/Guppy at [A-I][1-5], 14 of 14 health/)
      expect(moved.getAttribute("aria-label")).not.toMatch(/at B3/)
    })
  })

  it("casts the first affordable card after banking coin by selling", async () => {
    const { container } = renderGame()
    await flushDeal(container)

    // Sell-to-play economy: turn 1 starts at 0 Coin. Click the in-card "Sell"
    // button on a couple of cards to bank Coin before anything is castable.
    const sellButtons = screen.getAllByRole("button", { name: /^sell /i })
    for (const btn of sellButtons.slice(0, 2)) {
      act(() => {
        fireEvent.click(btn)
      })
    }
    await waitFor(() => {
      expect(readCoin()).toBeGreaterThan(0)
    })
    const coin = readCoin()

    // scan the remaining hand for the first card whose displayed cost is affordable
    const cards = Array.from(container.querySelectorAll("[data-card-uid]"))
    const castable = cards.filter((el) => {
      const m = (el.textContent ?? "").match(/^(\d+)/)
      return m && Number(m[1]) <= coin
    })

    if (castable.length === 0) {
      // Don't fail the suite on an unlucky shuffle — the move test is the guard.
      console.log("[strictmode] no affordable card after selling — skipping cast assertion")
      return
    }

    // scan castable cards for one that targets enemies (attack type badge) or is self-targeting
    let card: Element | null = null
    let uid = ""
    for (const c of castable) {
      const t = c.textContent ?? ""
      uid = c.getAttribute("data-card-uid")!
      // self-target (coin / draw) or attack-type → works with the test flow
      if (/coin|draw \d+ card/i.test(t) || /\battack\b/i.test(t)) {
        card = c
        break
      }
    }

    if (!card) {
      console.log("[strictmode] no suitable affordable card — skipping cast assertion")
      return
    }

    const text = card.textContent ?? ""
    const isCoinCard = /coin/i.test(text)
    const isSelfTarget = isCoinCard || /Draw \d+ card/i.test(text)

    if (isSelfTarget) {
      // self-target card: a single click casts it (no enemy target needed)
      const coinBefore = readCoin()
      act(() => {
        fireEvent.click(card)
      })

      // core regression: the cast consumes the card from the hand
      await waitFor(() => {
        expect(container.querySelector(`[data-card-uid="${uid}"]`)).toBeNull()
      })

      // coin-gain cards net positive (gain exceeds cost), so coin rises
      if (isCoinCard) {
        await waitFor(() => {
          expect(readCoin()).toBeGreaterThan(coinBefore)
        })
      }
      return
    }

    // unit-targeted card (e.g. Demand Letter): click to arm it, then click a
    // valid enemy target token
    act(() => {
      fireEvent.click(card)
    })
    const enemies = screen
      .getAllByRole("button", { name: /health$/ })
      .filter((b) => !(b.getAttribute("aria-label") ?? "").startsWith("Guppy"))
    expect(enemies.length).toBeGreaterThan(0)

    const target = enemies[0]
    const targetName = (target.getAttribute("aria-label") ?? "").split(",")[0] // e.g. "Thug at G2"
    const hpBefore = parseHp(target.getAttribute("aria-label"))

    act(() => {
      fireEvent.click(target)
    })

    // core regression: the cast consumes the card from the hand
    await waitFor(() => {
      expect(container.querySelector(`[data-card-uid="${uid}"]`)).toBeNull()
    })

    // damage card -> the target enemy's HP decreased
    const escaped = targetName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    await waitFor(() => {
      const el = screen.getByRole("button", { name: new RegExp(`^${escaped}`) })
      expect(parseHp(el.getAttribute("aria-label"))).toBeLessThan(hpBefore)
    })
  })
})
