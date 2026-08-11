// @vitest-environment jsdom
/**
 * GameCard: playable/unplayable/dragging states + sell/tap handlers.
 */
import "@testing-library/jest-dom/vitest"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { GameCard } from "@/components/game/card"
import { CARD_LIBRARY } from "@/lib/game"

afterEach(cleanup)

const card = { uid: "c_test", def: CARD_LIBRARY.demand_letter }

describe("GameCard", () => {
  it("renders cost, name, description and sell value", () => {
    render(
      <GameCard card={card} playable dragging={false} onPointerDown={() => {}} onTap={() => {}} onSell={() => {}} />,
    )
    expect(screen.getByText(card.def.name)).toBeInTheDocument()
    expect(screen.getAllByText(card.def.cost.toString()).length).toBeGreaterThan(0)
    expect(screen.getByText(/sell/i)).toBeInTheDocument()
  })

  it("calls onSell when the Sell button is clicked", () => {
    const onSell = vi.fn()
    render(
      <GameCard card={card} playable dragging={false} onPointerDown={() => {}} onTap={() => {}} onSell={onSell} />,
    )
    fireEvent.click(screen.getByText(/sell/i))
    expect(onSell).toHaveBeenCalledTimes(1)
  })

  it("calls onTap when the card itself is clicked", () => {
    const onTap = vi.fn()
    render(
      <GameCard card={card} playable dragging={false} onPointerDown={() => {}} onTap={onTap} onSell={() => {}} />,
    )
    fireEvent.click(screen.getByText(card.def.name))
    expect(onTap).toHaveBeenCalledTimes(1)
  })

  it("marks unplayable cards as not draggable", () => {
    const { container } = render(
      <GameCard card={card} playable={false} dragging={false} onPointerDown={() => {}} onTap={() => {}} onSell={() => {}} />,
    )
    expect(container.firstChild).toHaveClass("cursor-not-allowed")
  })

  it("dims a dragging card without making it transparent", () => {
    const { container } = render(
      <GameCard card={card} playable dragging onPointerDown={() => {}} onTap={() => {}} onSell={() => {}} />,
    )
    expect(container.firstChild).toHaveClass("brightness-[0.45]")
    expect(container.firstChild).toHaveClass("opacity-100")
  })

  it("keeps unplayable cards opaque", () => {
    const { container } = render(
      <GameCard card={card} playable={false} dragging={false} onPointerDown={() => {}} onTap={() => {}} onSell={() => {}} />,
    )
    expect(container.firstChild).toHaveClass("opacity-100")
    expect(container.firstChild).not.toHaveClass("opacity-70")
  })

  it("marks an armed card with the gold ring", () => {
    const { container } = render(
      <GameCard card={card} playable dragging={false} armed onPointerDown={() => {}} onTap={() => {}} onSell={() => {}} />,
    )
    expect(container.firstChild).toHaveClass("ring-2")
    expect(container.firstChild).toHaveClass("ring-gold")
  })
})
