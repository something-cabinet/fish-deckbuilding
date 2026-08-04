// @vitest-environment jsdom
/**
 * FishMafiaGame turn flow: end turn runs the async enemy phase and advances
 * the turn; buy is disabled before enough coin is banked; the drag machinery
 * (pointer down/move/up) exercises without crashing in jsdom.
 */
import "@testing-library/jest-dom/vitest"
import { act, cleanup, fireEvent, screen, waitFor } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { installJsdomShims, renderGame } from "./test-utils"
import { BUY_COST } from "@/lib/game"

installJsdomShims()

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

async function flushDeal() {
  await waitFor(() => {
    expect(document.querySelectorAll("[data-card-uid]").length).toBeGreaterThan(0)
  })
}

describe("FishMafiaGame turn flow", () => {
  it("ends the turn: the enemy phase runs and the turn advances", async () => {
    renderGame()
    await flushDeal()

    vi.useFakeTimers()
    act(() => {
      fireEvent.click(screen.getByRole("button", { name: /end turn/i }))
    })
    // advance through the enemy phase waits (300/480ms per step + 250ms)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000)
    })

    expect(screen.getByText((_, el) => el?.textContent === "Turn 2")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /end turn/i })).toBeEnabled()
  })

  it("disables buy until enough coin is banked", async () => {
    renderGame()
    await flushDeal()
    const buy = screen.getByRole("button", { name: new RegExp(`buy card.*${BUY_COST}`, "i") }) as HTMLButtonElement
    // turn 1 starts with 0 coin — buy must be disabled
    expect(buy.disabled).toBe(true)
  })

  it("drag machinery: pointer down/move/up on a unit does not crash", async () => {
    renderGame()
    await flushDeal()

    const hero = screen.getByRole("button", { name: /guppy at/i })
    act(() => {
      fireEvent.pointerDown(hero, { clientX: 100, clientY: 100 })
    })
    act(() => {
      fireEvent.pointerMove(window, { clientX: 130, clientY: 120 })
    })
    act(() => {
      fireEvent.pointerUp(window, { clientX: 140, clientY: 130 })
    })

    expect(screen.getByRole("button", { name: /guppy at/i })).toBeInTheDocument()
  })
})
