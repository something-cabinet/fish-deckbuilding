// @vitest-environment jsdom
/**
 * CardCreateScreen: the form gates saving on a name, drives the live preview,
 * and onSave receives a slugified custom card id.
 */
import "@testing-library/jest-dom/vitest"
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { CardCreateScreen } from "@/components/game/card-create-screen"

afterEach(cleanup)

describe("CardCreateScreen", () => {
  it("Save is disabled until a name is entered", () => {
    render(<CardCreateScreen onBack={() => {}} onSave={() => {}} />)
    const save = screen.getByRole("button", { name: /save to library/i }) as HTMLButtonElement
    expect(save.disabled).toBe(true)

    act(() => fireEvent.change(screen.getByPlaceholderText(/racketeering/i), { target: { value: "Bribe" } }))
    expect(save.disabled).toBe(false)
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
    act(() => fireEvent.click(screen.getByRole("button", { name: /save to library/i })))

    expect(onSave).toHaveBeenCalledTimes(1)
    const def = onSave.mock.calls[0][0]
    expect(def.name).toBe("Bribe Collector")
    expect(def.id).toMatch(/^custom_bribe_collector_/)
  })

  it("Back fires onBack", () => {
    const onBack = vi.fn()
    render(<CardCreateScreen onBack={onBack} onSave={() => {}} />)
    act(() => fireEvent.click(screen.getByRole("button", { name: /back/i })))
    expect(onBack).toHaveBeenCalledTimes(1)
  })
})
