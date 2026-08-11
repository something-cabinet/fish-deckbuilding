// @vitest-environment jsdom
/**
 * TrinketCreateScreen: Save is gated on a name plus at least one stat or
 * trigger, stats and trigger effects reach the saved def, and an edited
 * trinket keeps its id.
 */
import "@testing-library/jest-dom/vitest"
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import type { TrinketDef } from "@/lib/game/trinkets"
import { TrinketCreateScreen } from "@/components/game/trinket-create-screen"

afterEach(cleanup)

function renderScreen(props: Partial<Parameters<typeof TrinketCreateScreen>[0]> = {}) {
  return render(<TrinketCreateScreen onBack={() => {}} onSave={() => {}} {...props} />)
}

function saveButton() {
  return screen.getByRole("button", { name: /^save$/i }) as HTMLButtonElement
}

function typeName(value: string) {
  act(() => fireEvent.change(screen.getByLabelText(/name/i), { target: { value } }))
}

describe("TrinketCreateScreen", () => {
  it("Save is disabled until the trinket is named and does something", () => {
    renderScreen()
    expect(saveButton().disabled).toBe(true)

    typeName("Gold Pinky Ring")
    // a named trinket with no stats and no triggers is still inert
    expect(saveButton().disabled).toBe(true)

    act(() => fireEvent.click(screen.getByRole("button", { name: /increase max hp/i })))
    expect(saveButton().disabled).toBe(false)
  })

  it("saves stat modifiers, dropping the zeroed ones", () => {
    const onSave = vi.fn()
    renderScreen({ onSave })

    typeName("Shark Tooth")
    act(() => fireEvent.click(screen.getByRole("button", { name: /increase max hp/i })))
    act(() => fireEvent.click(saveButton()))

    const def = onSave.mock.calls[0][0] as TrinketDef
    expect(def.stats).toEqual({ maxHp: 1 })
    expect(def.triggers).toBeUndefined()
    expect(def.id).toMatch(/^trinket_shark_tooth_/)
  })

  it("saves a trigger effect under the trigger it was authored on", () => {
    const onSave = vi.fn()
    renderScreen({ onSave })

    typeName("Lucky Fin")
    act(() => fireEvent.click(screen.getByRole("button", { name: /add turn start effect/i })))
    act(() => fireEvent.click(saveButton()))

    const def = onSave.mock.calls[0][0] as TrinketDef
    expect(def.triggers).toEqual({ onTurnStart: [{ kind: "gainCoin", amount: 1 }] })
    expect(def.stats).toBeUndefined()
  })

  it("editing keeps the id and routes through onUpdate", () => {
    const onSave = vi.fn()
    const onUpdate = vi.fn()
    const editTrinket: TrinketDef = {
      id: "bent_penny",
      name: "Bent Penny",
      description: "Gain 1 coin whenever you defeat an enemy.",
      icon: "Coins",
      rarity: "common",
      triggers: { onEnemyKilled: [{ kind: "gainCoin", amount: 1 }] },
    }
    renderScreen({ editTrinket, onSave, onUpdate })

    act(() => fireEvent.click(screen.getByRole("button", { name: /^update$/i })))

    expect(onSave).not.toHaveBeenCalled()
    const def = onUpdate.mock.calls[0][0] as TrinketDef
    expect(def.id).toBe("bent_penny")
    expect(def.triggers).toEqual({ onEnemyKilled: [{ kind: "gainCoin", amount: 1 }] })
  })
})
