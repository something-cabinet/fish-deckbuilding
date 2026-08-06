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

const baseCards = Object.values(CARD_LIBRARY)

const customCard: CardDef = {
  ...CARD_LIBRARY.demand_letter,
  id: "custom_bribe",
  name: "Bribe Collector",
}

describe("CardLibraryScreen", () => {
  function renderScreen(props: Partial<Parameters<typeof CardLibraryScreen>[0]> = {}) {
    return render(
      <CardLibraryScreen
        cards={baseCards}
        enemies={[]}
        stages={[]}
        onBack={() => {}}
        onCreate={() => {}}
        onEdit={() => {}}
        onDelete={() => {}}
        onEnemyCreate={() => {}}
        onEnemyEdit={() => {}}
        onEnemyDelete={() => {}}
        onStageCreate={() => {}}
        onStageEdit={() => {}}
        onStageDelete={() => {}}
        {...props}
      />,
    )
  }

  it("renders all base cards and the live count", () => {
    renderScreen()
    expect(screen.getByText("Demand Letter")).toBeInTheDocument()
    expect(screen.getByText("Hired Muscle")).toBeInTheDocument()
    expect(screen.getByText(`${baseCards.length} cards`)).toBeInTheDocument()
  })

  it("filters by type via the chips", () => {
    renderScreen()
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
    renderScreen({ cards: [...baseCards, customCard], customIds: [customCard.id] })
    expect(screen.getByText("Bribe Collector")).toBeInTheDocument()
    expect(screen.getAllByText(/custom/i).length).toBeGreaterThan(0)
  })

  it("Back fires onBack and Create fires onCreate", () => {
    const onBack = vi.fn()
    const onCreate = vi.fn()
    renderScreen({ onBack, onCreate })
    act(() => fireEvent.click(screen.getByRole("button", { name: /menu/i })))
    act(() => fireEvent.click(screen.getByRole("button", { name: /create/i })))
    expect(onBack).toHaveBeenCalledTimes(1)
    expect(onCreate).toHaveBeenCalledTimes(1)
  })

  it("Edit fires onEdit with the card of that tile", () => {
    const onEdit = vi.fn()
    renderScreen({ cards: [...baseCards, customCard], onEdit })
    act(() => fireEvent.click(screen.getByRole("button", { name: "Edit Bribe Collector" })))
    expect(onEdit).toHaveBeenCalledTimes(1)
    expect(onEdit).toHaveBeenCalledWith(customCard)
  })

  it("Delete fires onDelete with the id of that tile", () => {
    const onDelete = vi.fn()
    renderScreen({ cards: [...baseCards, customCard], onDelete })
    act(() => fireEvent.click(screen.getByRole("button", { name: "Delete Bribe Collector" })))
    expect(onDelete).toHaveBeenCalledTimes(1)
    expect(onDelete).toHaveBeenCalledWith(customCard.id)
  })

  it("switches subtabs and shows enemy library / stage placeholder", () => {
    const onSubtabChange = vi.fn()
    renderScreen({ onSubtabChange })
    expect(screen.getByText("Demand Letter")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /create/i })).toBeInTheDocument()

    act(() => fireEvent.click(screen.getByRole("button", { name: /enemies/i })))
    expect(screen.queryByText("Demand Letter")).not.toBeInTheDocument()
    expect(screen.queryByText("No enemies yet — create your first one.")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /create enemy/i })).toBeInTheDocument()
    expect(onSubtabChange).toHaveBeenCalledWith("enemies")
    // the cards-specific Create button should not be in the header
    expect(screen.queryByRole("button", { name: /^create$/i })).not.toBeInTheDocument()

    act(() => fireEvent.click(screen.getByRole("button", { name: /stages/i })))
    expect(screen.getByText(/no stages yet/i)).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: /the shallows/i })).toBeInTheDocument()

    act(() => fireEvent.click(screen.getByRole("button", { name: /^cards$/i })))
    expect(screen.getByText("Demand Letter")).toBeInTheDocument()
  })

  it("opens on initialSubtab so an editor round-trip returns to the right tab", () => {
    renderScreen({ initialSubtab: "enemies" })
    expect(screen.queryByText("Demand Letter")).not.toBeInTheDocument()
    expect(screen.getByRole("button", { name: /create enemy/i })).toBeInTheDocument()
  })
})
