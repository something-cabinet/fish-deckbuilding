// @vitest-environment jsdom
/**
 * CharacterCreateScreen: Save is gated on a name plus at least one starter
 * card, the three stats and the deck reach the saved def, and an edited
 * character keeps its id.
 */
import "@testing-library/jest-dom/vitest"
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { CARD_LIBRARY } from "@/lib/game/cards"
import type { CharacterDef } from "@/lib/game/characters"
import { CharacterCreateScreen } from "@/components/game/character-create-screen"

vi.mock("./sprites", () => ({
  spriteUrl: (name: string) => `/sprites/${name}.png`,
  useSpriteNames: () => ["hero", "thug"],
}))

afterEach(cleanup)

const FIRST_CARD = Object.values(CARD_LIBRARY)[0]

function renderScreen(props: Partial<Parameters<typeof CharacterCreateScreen>[0]> = {}) {
  return render(<CharacterCreateScreen onBack={() => {}} onSave={() => {}} {...props} />)
}

function saveButton() {
  return screen.getByRole("button", { name: /^save$/i }) as HTMLButtonElement
}

function typeName(value: string) {
  act(() => fireEvent.change(screen.getByLabelText(/^name$/i), { target: { value } }))
}

/** Add one copy of a card to the starter deck via its stepper. */
function addCopy(cardName: string) {
  act(() =>
    fireEvent.click(screen.getByRole("button", { name: `Increase ${cardName} copies` })),
  )
}

describe("CharacterCreateScreen", () => {
  it("Save is disabled until the character is named and has a deck", () => {
    renderScreen()
    expect(saveButton().disabled).toBe(true)

    typeName("Bruno")
    // a named character with an empty starter deck cannot start a run
    expect(saveButton().disabled).toBe(true)

    addCopy(FIRST_CARD.name)
    expect(saveButton().disabled).toBe(false)
  })

  it("saves the authored stats and starter deck", () => {
    const onSave = vi.fn()
    renderScreen({ onSave })

    typeName("Bruno")
    act(() => fireEvent.click(screen.getByRole("button", { name: /increase health/i })))
    act(() => fireEvent.click(screen.getByRole("button", { name: /increase melee damage/i })))
    act(() => fireEvent.click(screen.getByRole("button", { name: /increase speed/i })))
    addCopy(FIRST_CARD.name)
    addCopy(FIRST_CARD.name)
    act(() => fireEvent.click(saveButton()))

    const def = onSave.mock.calls[0][0] as CharacterDef
    expect(def.stats).toEqual({ maxHp: 15, atk: 3, move: 3 })
    expect(def.starterDeck).toEqual([FIRST_CARD.id, FIRST_CARD.id])
    expect(def.id).toMatch(/^character_bruno_/)
  })

  it("defaults to the hero sprite and saves the picked one", () => {
    const onSave = vi.fn()
    renderScreen({ onSave })

    typeName("Bruno")
    addCopy(FIRST_CARD.name)
    expect(screen.getByRole("button", { name: /use hero sprite/i })).toHaveAttribute(
      "aria-pressed",
      "true",
    )

    act(() => fireEvent.click(screen.getByRole("button", { name: /use thug sprite/i })))
    act(() => fireEvent.click(saveButton()))

    expect((onSave.mock.calls[0][0] as CharacterDef).icon).toBe("thug")
  })

  it("removing the last copy of a card drops it from the deck", () => {
    const onSave = vi.fn()
    renderScreen({ onSave })

    typeName("Bruno")
    addCopy(FIRST_CARD.name)
    addCopy(FIRST_CARD.name)
    act(() =>
      fireEvent.click(
        screen.getByRole("button", { name: `Decrease ${FIRST_CARD.name} copies` }),
      ),
    )
    act(() => fireEvent.click(saveButton()))

    expect((onSave.mock.calls[0][0] as CharacterDef).starterDeck).toEqual([FIRST_CARD.id])
  })

  it("editing keeps the id and routes through onUpdate", () => {
    const onSave = vi.fn()
    const onUpdate = vi.fn()
    const editCharacter: CharacterDef = {
      id: "guppy_debtor",
      name: "Guppy",
      title: "The Debtor",
      description: "Small fish, big ledger.",
      icon: "hero",
      stats: { maxHp: 14, atk: 2, move: 2 },
      starterDeck: [FIRST_CARD.id, FIRST_CARD.id],
    }
    renderScreen({ editCharacter, onSave, onUpdate })

    act(() => fireEvent.click(screen.getByRole("button", { name: /^update$/i })))

    expect(onSave).not.toHaveBeenCalled()
    const def = onUpdate.mock.calls[0][0] as CharacterDef
    expect(def.id).toBe("guppy_debtor")
    expect(def.stats).toEqual({ maxHp: 14, atk: 2, move: 2 })
    expect(def.starterDeck).toEqual([FIRST_CARD.id, FIRST_CARD.id])
  })
})
