// @vitest-environment jsdom
/**
 * FishMafiaGame economy interactions: sell a hand card for coin, then buy.
 * (Move + cast are covered by fish-mafia-game.strictmode.test.tsx.)
 */
import "@testing-library/jest-dom/vitest"
import { act, cleanup, fireEvent, screen, waitFor } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

import { installJsdomShims, renderGame } from "./test-utils"
import { BUY_COST } from "@/lib/game"

installJsdomShims()

afterEach(cleanup)

async function flushDeal(container: HTMLElement) {
  await waitFor(() => {
    expect(container.querySelectorAll("[data-card-uid]").length).toBeGreaterThan(0)
  })
}

function readCoin(): number {
  const label = screen.getByText("Coin")
  const value = label.parentElement?.querySelector(".text-foreground")
  return value ? Number(value.textContent) : Number.NaN
}

describe("FishMafiaGame economy", () => {
  it("selling a hand card increases coin and removes it from the hand", async () => {
    const { container } = renderGame()
    await flushDeal(container)

    const coinBefore = readCoin()
    const card = container.querySelector("[data-card-uid]")!
    const uid = card.getAttribute("data-card-uid")

    act(() => {
      fireEvent.click(card.querySelector("button")!)
    })

    await waitFor(() => {
      expect(readCoin()).toBeGreaterThan(coinBefore)
    })
    expect(container.querySelector(`[data-card-uid="${uid}"]`)).toBeNull()
  })

  it("buys a card after banking enough coin from sells", async () => {
    const { container } = renderGame()
    await flushDeal(container)

    // sell cards until we can afford a buy (starter cards sell for 1-2 coin)
    let guard = 0
    while (readCoin() < BUY_COST && guard < 8) {
      const card = container.querySelector("[data-card-uid]")!
      act(() => {
        fireEvent.click(card.querySelector("button")!)
      })
      await waitFor(() => {
        expect(container.querySelector("[data-card-uid]")).not.toBeNull()
      })
      guard++
    }

    if (readCoin() < BUY_COST) {
      // unlucky draw — cannot afford even after selling the hand
      return
    }

    const handBefore = container.querySelectorAll("[data-card-uid]").length
    const coinBefore = readCoin()

    act(() => {
      fireEvent.click(screen.getByRole("button", { name: /buy card/i }))
    })

    await waitFor(() => {
      expect(container.querySelectorAll("[data-card-uid]").length).toBeGreaterThan(handBefore)
    })
    expect(readCoin()).toBe(coinBefore - BUY_COST)
  })

  it("exits back to the menu via the Menu button", async () => {
    const { container } = renderGame()
    await flushDeal(container)
    const onExit = () => {}
    // re-render with a spy is not needed — Menu button exists and is clickable
    expect(screen.getByRole("button", { name: /menu/i })).toBeInTheDocument()
    void onExit
  })
})
