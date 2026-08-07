// @vitest-environment jsdom
/**
 * EnemyCreateScreen: the behaviour panel reaches the saved EnemyDef, and an
 * untouched one leaves no trace on it.
 */
import "@testing-library/jest-dom/vitest"
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { EnemyCreateScreen } from "@/components/game/enemy-create-screen"
import { AiArchetype, UnitKind, type EnemyDef } from "@/lib/game/units"

afterEach(cleanup)

function nameIt(value: string) {
  act(() => fireEvent.change(screen.getByPlaceholderText(/shark enforcer/i), { target: { value } }))
}

function save() {
  act(() => fireEvent.click(screen.getByRole("button", { name: /^save$/i })))
}

describe("EnemyCreateScreen behaviour wiring", () => {
  it("omits aiProfile when the designer never touched the behaviour panel", () => {
    const onSave = vi.fn()
    render(<EnemyCreateScreen onBack={() => {}} onSave={onSave} />)
    nameIt("Plain Thug")
    save()

    const def: EnemyDef = onSave.mock.calls[0][0]
    expect(def.aiProfile).toBeUndefined()
  })

  it("saves the chosen archetype", () => {
    const onSave = vi.fn()
    render(<EnemyCreateScreen onBack={() => {}} onSave={onSave} />)
    nameIt("Sniper Eel")
    act(() => fireEvent.click(screen.getByRole("button", { name: /artillery/i })))
    save()

    const def: EnemyDef = onSave.mock.calls[0][0]
    expect(def.aiProfile).toEqual({ archetype: AiArchetype.Artillery })
  })

  it("round-trips an existing enemy's profile into the editor", () => {
    const existing: EnemyDef = {
      id: "eel",
      name: "Sniper Eel",
      kind: UnitKind.Thug,
      hp: 6,
      atk: 3,
      move: 2,
      range: 2,
      goldDrop: 8,
      isMinion: false,
      icon: "thug",
      deck: [],
      aiProfile: { archetype: AiArchetype.Berserker },
    }
    render(<EnemyCreateScreen onBack={() => {}} onSave={() => {}} editEnemy={existing} />)
    expect(screen.getByRole("button", { name: /berserker/i })).toHaveAttribute("aria-pressed", "true")
  })
})
