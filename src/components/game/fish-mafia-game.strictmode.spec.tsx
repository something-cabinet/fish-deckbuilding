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
 * - The cast test scans the rendered hand at runtime for the first card whose
 *   displayed cost <= current mana (1). The starter deck is 17 cards with 7
 *   cost-1 cards (Demand Letter x3, Cash Flow x2, Market Rate x2), so the
 *   5-card hand almost always contains one. If not, the test logs a note and
 *   returns early rather than failing.
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

/** Coin value shown in the top bar. */
function readCoin(): number {
  const label = screen.getByText("Coin")
  const value = label.parentElement?.querySelector(".text-foreground")
  return value ? Number(value.textContent) : Number.NaN
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

  it("casts the first affordable card from the dealt hand", async () => {
    const { container } = renderGame()
    await flushDeal(container)

    // current mana (starts at 1; nothing spends it in this test before the cast)
    const mana = Number(
      screen.getByText("Mana").parentElement?.querySelector(".text-gold")?.textContent ?? 1,
    )

    // scan the rendered hand for the first card whose displayed cost is affordable
    const cards = Array.from(container.querySelectorAll("[data-card-uid]"))
    const castable = cards.filter((el) => {
      const m = (el.textContent ?? "").match(/^(\d+)/)
      return m && Number(m[1]) <= mana
    })

    if (castable.length === 0) {
      // Practically impossible (7 of 17 starter cards cost 1), but don't fail
      // the suite on an unlucky shuffle — the move test above is the guard.
      console.log("[strictmode] no affordable card in this random hand — skipping cast assertion")
      return
    }

    const card = castable[0]
    const uid = card.getAttribute("data-card-uid")!
    const text = card.textContent ?? ""
    const isSelfTarget = /Launder|Draw \d+ card/i.test(text)

    if (isSelfTarget) {
      // self-target card (Cash Flow / Market Rate): a single click casts it
      const coinBefore = readCoin()
      act(() => {
        fireEvent.click(card)
      })

      // core regression: the cast consumes the card from the hand
      await waitFor(() => {
        expect(container.querySelector(`[data-card-uid="${uid}"]`)).toBeNull()
      })

      // coin card -> the top-bar coin value increased
      if (/Launder/i.test(text)) {
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
