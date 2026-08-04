// @vitest-environment jsdom
/**
 * Board: renders the grid, highlights reachable/highlight tiles, and shows
 * floating combat numbers + hit detection from fx events.
 */
import "@testing-library/jest-dom/vitest"
import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

import { installJsdomShims } from "./test-utils"
import { Board } from "@/components/game/board"
import { createInitialState, FxKind, type FxEvent } from "@/lib/game/battle"

installJsdomShims()

afterEach(cleanup)

const heroPos = { x: 1, y: 2 }

describe("Board", () => {
  it("renders the grid and unit tokens", () => {
    const state = createInitialState()
    const { container } = render(
      <Board
        state={state}
        fx={[]}
        reachable={[]}
        highlightTiles={[]}
        highlightUnitIds={[]}
        onCellPointerUp={() => {}}
        onCellClick={() => {}}
        onUnitClick={() => {}}
        onUnitPointerDown={() => {}}
      />,
    )
    expect(container.querySelectorAll('[data-drop="tile"]').length).toBe(9 * 5)
    expect(screen.getByRole("button", { name: /guppy at/i })).toBeInTheDocument()
  })

  it("shows reachable and highlight tiles when provided", () => {
    const state = createInitialState()
    const { container } = render(
      <Board
        state={state}
        fx={[]}
        reachable={[{ x: 2, y: 2 }]}
        highlightTiles={[{ x: 3, y: 2 }]}
        highlightUnitIds={[]}
        onCellPointerUp={() => {}}
        onCellClick={() => {}}
        onUnitClick={() => {}}
        onUnitPointerDown={() => {}}
      />,
    )
    expect(container.querySelector('[data-x="2"][data-y="2"]')).toHaveClass("bg-teal/15")
    expect(container.querySelector('[data-x="3"][data-y="2"]')).toHaveClass("bg-gold/20")
  })

  it("renders floating damage and heal numbers from fx", () => {
    const state = createInitialState()
    const fx: FxEvent[] = [
      { id: 1, kind: FxKind.Shock, to: heroPos, amount: 5 },
      { id: 2, kind: FxKind.Heal, to: heroPos, amount: 2 },
      { id: 3, kind: FxKind.Coin, to: heroPos, amount: 3 },
    ]
    render(
      <Board
        state={state}
        fx={fx}
        reachable={[]}
        highlightTiles={[]}
        highlightUnitIds={[]}
        onCellPointerUp={() => {}}
        onCellClick={() => {}}
        onUnitClick={() => {}}
        onUnitPointerDown={() => {}}
      />,
    )
    expect(screen.getByText("-5")).toBeInTheDocument()
    expect(screen.getByText("+2")).toBeInTheDocument()
    expect(screen.getByText("+3")).toBeInTheDocument()
  })

  it("marks hit units from shock/melee/death fx", () => {
    const state = createInitialState()
    const fx: FxEvent[] = [{ id: 1, kind: FxKind.Shock, to: heroPos, amount: 5 }]
    const { container } = render(
      <Board
        state={state}
        fx={fx}
        reachable={[]}
        highlightTiles={[]}
        highlightUnitIds={[]}
        onCellPointerUp={() => {}}
        onCellClick={() => {}}
        onUnitClick={() => {}}
        onUnitPointerDown={() => {}}
      />,
    )
    expect(container.querySelector(".animate-fm-shake")).not.toBeNull()
  })
})
