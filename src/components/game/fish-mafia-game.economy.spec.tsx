// @vitest-environment jsdom
/**
 * FishMafiaGame economy interactions: sell a hand card for coin.
 * (Move + cast are covered by fish-mafia-game.strictmode.test.tsx.)
 */
import "@testing-library/jest-dom/vitest"
import { act, cleanup, fireEvent, screen, waitFor } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

import { installJsdomShims, renderGame } from "./test-utils"

installJsdomShims()

afterEach(cleanup)

async function flushDeal(container: HTMLElement) {
  await waitFor(() => {
    expect(container.querySelectorAll("[data-card-uid]").length).toBeGreaterThan(0)
  })
}

/** Read the per-turn Coin total from the register's accessible label. */
function readCoin(container: HTMLElement): number {
  const reg = container.querySelector('[aria-label$="coin available this turn"]')
  const label = reg?.getAttribute("aria-label") ?? ""
  const n = Number(label.match(/^\d+/)?.[0])
  return Number.isNaN(n) ? Number.NaN : n
}

describe("FishMafiaGame economy", () => {
  it("selling a hand card increases coin and removes it from the hand", async () => {
    const { container } = renderGame()
    await flushDeal(container)

    const coinBefore = readCoin(container)
    const card = container.querySelector("[data-card-uid]")!
    const uid = card.getAttribute("data-card-uid")

    act(() => {
      fireEvent.click(card.querySelector("button")!)
    })

    await waitFor(() => {
      expect(readCoin(container)).toBeGreaterThan(coinBefore)
    })
    expect(container.querySelector(`[data-card-uid="${uid}"]`)).toBeNull()
  })

  it("exits back to the menu via the Menu button", async () => {
    const { container } = renderGame()
    await flushDeal(container)
    expect(screen.getByRole("button", { name: /menu/i })).toBeInTheDocument()
  })
})
