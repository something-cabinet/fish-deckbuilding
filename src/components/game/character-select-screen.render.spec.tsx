// @vitest-environment jsdom
/**
 * CharacterSelectScreen: the roster comes from the character database, the
 * first entry is preselected, and Begin Run reports the picked id.
 */
import "@testing-library/jest-dom/vitest"
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import type { CharacterDef } from "@/lib/game/characters"
import { CharacterSelectScreen } from "@/components/game/character-select-screen"

afterEach(cleanup)

const GUPPY: CharacterDef = {
  id: "guppy_debtor",
  name: "Guppy",
  title: "The Debtor",
  description: "Small fish, big ledger.",
  icon: "hero",
  stats: { maxHp: 14, atk: 2, move: 2 },
  starterDeck: ["shakedown", "shakedown", "kneecap"],
}

const BRUNO: CharacterDef = {
  id: "bruno_enforcer",
  name: "Bruno",
  title: "The Enforcer",
  description: "Hits hard, swims slow.",
  icon: "thug",
  stats: { maxHp: 20, atk: 4, move: 1 },
  starterDeck: ["kneecap"],
}

function renderScreen(props: Partial<Parameters<typeof CharacterSelectScreen>[0]> = {}) {
  return render(
    <CharacterSelectScreen
      characters={[GUPPY]}
      onBack={() => {}}
      onConfirm={() => {}}
      {...props}
    />,
  )
}

describe("CharacterSelectScreen", () => {
  it("shows each character's authored stats and deck size", () => {
    renderScreen()
    expect(screen.getByText("Guppy")).toBeInTheDocument()
    expect(screen.getByText("The Debtor")).toBeInTheDocument()
    // health, deck size and the shared atk/speed value come from the def
    expect(screen.getByText("14")).toBeInTheDocument()
    expect(screen.getByText("3")).toBeInTheDocument()
    expect(screen.getAllByText("2")).toHaveLength(2)
  })

  it("preselects the first character and starts the run as them", () => {
    const onConfirm = vi.fn()
    renderScreen({ characters: [GUPPY, BRUNO], onConfirm })

    expect(screen.getByRole("button", { name: /guppy/i })).toHaveAttribute("aria-pressed", "true")
    expect(screen.getByRole("button", { name: /bruno/i })).toHaveAttribute("aria-pressed", "false")

    act(() => fireEvent.click(screen.getByRole("button", { name: /begin run/i })))
    expect(onConfirm).toHaveBeenCalledWith("guppy_debtor")
  })

  it("picking another character starts the run as them instead", () => {
    const onConfirm = vi.fn()
    renderScreen({ characters: [GUPPY, BRUNO], onConfirm })

    act(() => fireEvent.click(screen.getByRole("button", { name: /bruno/i })))
    act(() => fireEvent.click(screen.getByRole("button", { name: /begin run/i })))

    expect(onConfirm).toHaveBeenCalledWith("bruno_enforcer")
  })

  it("with no characters authored there is nothing to begin", () => {
    renderScreen({ characters: [] })
    expect(screen.getByText(/no characters authored/i)).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /begin run/i })).toBeDisabled()
  })
})
