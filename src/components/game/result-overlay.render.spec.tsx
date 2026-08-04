// @vitest-environment jsdom
/**
 * ResultOverlay: renders only for won/lost phases; hides during play.
 */
import "@testing-library/jest-dom/vitest"
import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { ResultOverlay } from "@/components/game/result-overlay"
import { createInitialState, Phase, type GameState } from "@/lib/game/battle"

afterEach(cleanup)

function withPhase(phase: Phase): GameState {
  const s = createInitialState()
  s.phase = phase
  return s
}

describe("ResultOverlay", () => {
  it("renders nothing during the player phase", () => {
    const { container } = render(<ResultOverlay state={withPhase(Phase.Player)} onRestart={() => {}} />)
    expect(container.firstChild).toBeNull()
  })

  it("shows the victory overlay", () => {
    render(<ResultOverlay state={withPhase(Phase.Won)} onRestart={() => {}} />)
    expect(screen.getByText(/debt collected/i)).toBeInTheDocument()
    expect(screen.getByText(/the ledger balances/i)).toBeInTheDocument()
  })

  it("shows the defeat overlay", () => {
    render(<ResultOverlay state={withPhase(Phase.Lost)} onRestart={() => {}} />)
    expect(screen.getByText(/foreclosed/i)).toBeInTheDocument()
    expect(screen.getByText(/the ledger closes/i)).toBeInTheDocument()
  })

  it("fires onRestart and shows surviving turns + coin", () => {
    const onRestart = vi.fn()
    const s = withPhase(Phase.Won)
    render(<ResultOverlay state={s} onRestart={onRestart} />)
    expect(screen.getByText(new RegExp(`Survived ${s.turn} turns`))).toBeInTheDocument()
    screen.getByRole("button", { name: /new racket/i }).click()
    expect(onRestart).toHaveBeenCalledTimes(1)
  })
})
