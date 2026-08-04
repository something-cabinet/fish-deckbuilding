// @vitest-environment jsdom
/**
 * CardLibraryScreen: renders the card library, filters by type, shows the
 * Custom badge, and Back fires onBack.
 */
import "@testing-library/jest-dom/vitest"
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { CARD_LIBRARY } from "@/lib/game"
import type { CardDef } from "@/lib/game/cards"
import { CardLibraryScreen } from "@/components/game/card-library-screen"

afterEach(cleanup)

const customCard: CardDef = {
  ...CARD_LIBRARY.demand_letter,
  id: "custom_bribe",
  name: "Bribe Collector",
}

describe("CardLibraryScreen", () => {
  it("renders all base cards and the live count", () => {
    render(<CardLibraryScreen customCards={[]} onBack={() => {}} onCreate={() => {}} />)
    expect(screen.getByText("Demand Letter")).toBeInTheDocument()
    expect(screen.getByText("Hired Muscle")).toBeInTheDocument()
    expect(screen.getByText(`${Object.keys(CARD_LIBRARY).length} cards`)).toBeInTheDocument()
  })

  it("filters by type via the chips", () => {
    render(<CardLibraryScreen customCards={[]} onBack={() => {}} onCreate={() => {}} />)
    act(() => fireEvent.click(screen.getByRole("button", { name: /skill/i })))
    expect(screen.getByText("Cash Flow")).toBeInTheDocument()
    expect(screen.getByText("Hush Money")).toBeInTheDocument()
    expect(screen.getByText("Shakedown")).toBeInTheDocument()
    expect(screen.queryByText("Demand Letter")).not.toBeInTheDocument()
    expect(screen.getByText("4 cards")).toBeInTheDocument()

    act(() => fireEvent.click(screen.getByRole("button", { name: /summon/i })))
    expect(screen.getByText("Hired Muscle")).toBeInTheDocument()
    expect(screen.getByText("1 cards")).toBeInTheDocument()
  })

  it("shows a Custom badge for authored cards and includes them in the grid", () => {
    render(<CardLibraryScreen customCards={[customCard]} onBack={() => {}} onCreate={() => {}} />)
    expect(screen.getByText("Bribe Collector")).toBeInTheDocument()
    expect(screen.getAllByText(/custom/i).length).toBeGreaterThan(0)
  })

  it("Back fires onBack and Create fires onCreate", () => {
    const onBack = vi.fn()
    const onCreate = vi.fn()
    render(<CardLibraryScreen customCards={[]} onBack={onBack} onCreate={onCreate} />)
    act(() => fireEvent.click(screen.getByRole("button", { name: /menu/i })))
    act(() => fireEvent.click(screen.getByRole("button", { name: /create/i })))
    expect(onBack).toHaveBeenCalledTimes(1)
    expect(onCreate).toHaveBeenCalledTimes(1)
  })
})
