// @vitest-environment jsdom
/**
 * CardCreateScreen: the form gates saving on a name, drives the live preview,
 * and onSave receives a slugified custom card id.
 */
import "@testing-library/jest-dom/vitest"
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { CardCreateScreen } from "@/components/game/card-create-screen"
import { FxKind } from "@/lib/game/battle"
import { CardTarget, CardType, type CardDef } from "@/lib/game/cards"
import type { SummonDef } from "@/lib/game/summons"

afterEach(() => {
  cleanup()
  sessionStorage.clear()
})

describe("CardCreateScreen", () => {
  function getSaveButton() {
    return screen.getByRole("button", { name: /^save$/i }) as HTMLButtonElement
  }

  it("Save is disabled until a name is entered", () => {
    render(<CardCreateScreen onBack={() => {}} onSave={() => {}} />)
    expect(getSaveButton().disabled).toBe(true)

    act(() => fireEvent.change(screen.getByPlaceholderText(/racketeering/i), { target: { value: "Bribe" } }))
    expect(getSaveButton().disabled).toBe(false)
  })

  it("live preview updates as the name changes", () => {
    render(<CardCreateScreen onBack={() => {}} onSave={() => {}} />)
    act(() => fireEvent.change(screen.getByPlaceholderText(/racketeering/i), { target: { value: "Kneecap Jr" } }))
    expect(screen.getByText(/kneecap jr/i)).toBeInTheDocument()
  })

  it("onSave receives a custom card with a slugified id and the chosen name", () => {
    const onSave = vi.fn()
    render(<CardCreateScreen onBack={() => {}} onSave={onSave} />)
    act(() => fireEvent.change(screen.getByPlaceholderText(/racketeering/i), { target: { value: "Bribe Collector" } }))
    act(() => fireEvent.click(getSaveButton()))

    expect(onSave).toHaveBeenCalledTimes(1)
    const def = onSave.mock.calls[0][0]
    expect(def.name).toBe("Bribe Collector")
    expect(def.id).toMatch(/^custom_bribe_collector_/)
  })

  describe("fields the form has no controls for", () => {
    const EXISTING: CardDef = {
      id: "demand_letter",
      name: "Demand Letter",
      type: CardType.Attack,
      cost: 1,
      value: 1,
      target: CardTarget.Enemy,
      range: 4,
      aoe: 0,
      desc: "Deal 2 damage to a target enemy.",
      icon: "Mail",
      fx: FxKind.Letter,
      effects: [{ kind: "damage", amount: 2 }],
      log: "Demand Letter hits {target} for 2.",
      logTone: "good",
    }

    it("saving an edited card keeps its fx, log line and log tone", () => {
      const onUpdate = vi.fn()
      render(<CardCreateScreen onBack={() => {}} onSave={() => {}} editCard={EXISTING} onUpdate={onUpdate} />)
      act(() => fireEvent.click(screen.getByRole("button", { name: /^update$/i })))

      expect(onUpdate).toHaveBeenCalledTimes(1)
      expect(onUpdate.mock.calls[0][0]).toMatchObject({
        id: "demand_letter",
        fx: FxKind.Letter,
        log: "Demand Letter hits {target} for 2.",
        logTone: "good",
      })
    })

    it("a new card gets the default fx and a blank neutral log", () => {
      const onSave = vi.fn()
      render(<CardCreateScreen onBack={() => {}} onSave={onSave} />)
      act(() => fireEvent.change(screen.getByPlaceholderText(/racketeering/i), { target: { value: "Bribe" } }))
      act(() => fireEvent.click(getSaveButton()))

      expect(onSave.mock.calls[0][0]).toMatchObject({ fx: FxKind.Shock, log: "", logTone: "neutral" })
    })
  })

  describe("summon effects", () => {
    const SUMMONS: SummonDef[] = [
      { id: "goon", name: "Goon", hp: 5, atk: 2, move: 2, range: 1, icon: "goon" },
      { id: "shark", name: "Shark", hp: 9, atk: 4, move: 3, range: 2, icon: "shark" },
    ]

    function addSummonEffect() {
      act(() => fireEvent.click(screen.getByRole("button", { name: /add effect/i })))
      act(() =>
        fireEvent.change(screen.getByLabelText(/effect 1 kind/i), { target: { value: "summon" } }),
      )
    }

    it("the picker lists each summon with its stats and previews the selected one", () => {
      render(<CardCreateScreen onBack={() => {}} onSave={() => {}} summons={SUMMONS} />)
      addSummonEffect()

      const picker = screen.getByLabelText(/effect 1 summon unit/i)
      expect(within(picker).getByText(/Shark — 9 HP · 4 ATK · Ranged/)).toBeInTheDocument()

      act(() => fireEvent.change(picker, { target: { value: "shark" } }))
      // the preview strip repeats the stats of whatever is selected
      expect(screen.getByText("Shark")).toBeInTheDocument()
      expect(screen.getByTitle("HP")).toHaveTextContent("9")
      expect(screen.getByTitle("Attack")).toHaveTextContent("4")
    })

    it("New opens the summon designer and selects what it saves", () => {
      const onSummonCreated = vi.fn()
      render(
        <CardCreateScreen
          onBack={() => {}}
          onSave={() => {}}
          summons={SUMMONS}
          onSummonCreated={onSummonCreated}
        />,
      )
      addSummonEffect()
      act(() => fireEvent.click(screen.getByRole("button", { name: /effect 1 new summon/i })))

      const designer = within(screen.getByRole("dialog"))
      act(() => fireEvent.change(designer.getByPlaceholderText(/goon/i), { target: { value: "Eel" } }))
      act(() => fireEvent.click(designer.getByRole("button", { name: /^save$/i })))

      expect(onSummonCreated).toHaveBeenCalledTimes(1)
      const created = onSummonCreated.mock.calls[0][0] as SummonDef
      expect(created.name).toBe("Eel")
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
      expect(screen.getByLabelText(/effect 1 summon unit/i)).toHaveValue(created.id)
    })

    it("without onSummonCreated the picker has no New button", () => {
      render(<CardCreateScreen onBack={() => {}} onSave={() => {}} summons={SUMMONS} />)
      addSummonEffect()
      expect(screen.queryByRole("button", { name: /new summon/i })).not.toBeInTheDocument()
    })
  })

  it("Back fires onBack", () => {
    const onBack = vi.fn()
    render(<CardCreateScreen onBack={onBack} onSave={() => {}} />)
    act(() => fireEvent.click(screen.getByRole("button", { name: /back/i })))
    expect(onBack).toHaveBeenCalledTimes(1)
  })
})
