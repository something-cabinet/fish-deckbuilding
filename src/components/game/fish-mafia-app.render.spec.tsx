// @vitest-environment jsdom
/**
 * App-shell navigation: menu → game / library / create, and back.
 * Drives the real FishMafiaApp so the Screen enum dispatch is exercised.
 */
import "@testing-library/jest-dom/vitest"
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

import { installJsdomShims } from "./test-utils"
import { FishMafiaApp } from "@/components/game/fish-mafia-app"

installJsdomShims()

afterEach(cleanup)

describe("FishMafiaApp screen navigation", () => {
  it("starts on the menu", () => {
    render(<FishMafiaApp />)
    expect(screen.getByRole("button", { name: /start/i })).toBeInTheDocument()
    expect(screen.getByRole("heading", { level: 1, name: /fish mafia/i })).toBeInTheDocument()
  })

  it("Start mounts the game, Menu exits back to the menu", () => {
    render(<FishMafiaApp />)
    act(() => {
      fireEvent.click(screen.getByRole("button", { name: /start/i }))
    })
    // game top bar renders
    expect(screen.getByText(/guppy the debtor/i)).toBeInTheDocument()

    act(() => {
      fireEvent.click(screen.getByRole("button", { name: /menu/i }))
    })
    expect(screen.getByRole("button", { name: /start/i })).toBeInTheDocument()
  })

  it("Library opens the card library and Back returns to the menu", () => {
    render(<FishMafiaApp />)
    act(() => {
      fireEvent.click(screen.getByRole("button", { name: /library/i }))
    })
    expect(screen.getByRole("heading", { name: /card library/i })).toBeInTheDocument()

    act(() => {
      fireEvent.click(screen.getByRole("button", { name: /menu/i }))
    })
    expect(screen.getByRole("button", { name: /start/i })).toBeInTheDocument()
  })

  it("Create opens the card creator, Back returns to the library", () => {
    render(<FishMafiaApp />)
    act(() => {
      fireEvent.click(screen.getByRole("button", { name: /create/i }))
    })
    expect(screen.getByText(/create/i)).toBeInTheDocument()

    act(() => {
      fireEvent.click(screen.getByRole("button", { name: /back/i }))
    })
    expect(screen.getByRole("heading", { name: /card library/i })).toBeInTheDocument()
  })

  it("saving a custom card from Create stays on the creator", () => {
    render(<FishMafiaApp />)
    act(() => {
      fireEvent.click(screen.getByRole("button", { name: /create/i }))
    })
    const input = screen.getByPlaceholderText(/racketeering/i)
    act(() => {
      fireEvent.change(input, { target: { value: "Bribe Collector" } })
    })
    act(() => {
      fireEvent.click(screen.getByRole("button", { name: /save to library/i }))
    })
    expect(screen.getByRole("heading", { name: /create card/i })).toBeInTheDocument()
  })
})
