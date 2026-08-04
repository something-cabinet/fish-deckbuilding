// @vitest-environment jsdom
/**
 * TopBar phase titles + foreclosure display for all four phases.
 */
import "@testing-library/jest-dom/vitest"
import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

import { TopBar } from "@/components/game/top-bar"
import { createInitialState, Phase, type GameState } from "@/lib/game/battle"

afterEach(cleanup)

function withPhase(phase: Phase): GameState {
  const s = createInitialState()
  s.phase = phase
  return s
}

describe("TopBar", () => {
  it("shows the player-phase title", () => {
    render(<TopBar state={withPhase(Phase.Player)} />)
    expect(screen.getByText(/your move/i)).toBeInTheDocument()
  })

  it("shows the enemy-phase title and enemy color", () => {
    render(<TopBar state={withPhase(Phase.Enemy)} />)
    expect(screen.getByText(/the mob moves/i)).toBeInTheDocument()
  })

  it("shows the victory title", () => {
    render(<TopBar state={withPhase(Phase.Won)} />)
    expect(screen.getByText(/debt collected/i)).toBeInTheDocument()
  })

  it("shows the defeat title", () => {
    render(<TopBar state={withPhase(Phase.Lost)} />)
    expect(screen.getByText(/foreclosed/i)).toBeInTheDocument()
  })

  it("renders the foreclosure countdown and turn", () => {
    const s = createInitialState()
    render(<TopBar state={s} />)
    expect(screen.getByText(`T-${s.foreclosure}`)).toBeInTheDocument()
    expect(screen.getByText(/^Turn/i)).toBeInTheDocument()
  })
})
