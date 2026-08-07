// @vitest-environment jsdom
/**
 * AiProfileEditor: archetype choice plus per-axis overrides, where "unchanged"
 * must stay genuinely absent from the emitted profile so presets keep flowing
 * through to enemies that never opted out of them.
 */
import "@testing-library/jest-dom/vitest"
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { AiProfileEditor } from "@/components/game/ai-profile-editor"
import { AiArchetype, AiScorer, ARCHETYPE_WEIGHTS } from "@/lib/game/units"

afterEach(cleanup)

const aggression = () => screen.getByLabelText(/aggression/i) as HTMLInputElement

describe("AiProfileEditor", () => {
  it("defaults to the brawler preset when the enemy has no profile", () => {
    render(<AiProfileEditor onChange={() => {}} />)
    expect(screen.getByRole("button", { name: /brawler/i })).toHaveAttribute("aria-pressed", "true")
    expect(aggression().value).toBe(
      String(ARCHETYPE_WEIGHTS[AiArchetype.Brawler][AiScorer.DistanceToTarget]),
    )
  })

  it("switching archetype emits it with no leftover overrides", () => {
    const onChange = vi.fn()
    render(
      <AiProfileEditor
        value={{ archetype: AiArchetype.Brawler, weights: { [AiScorer.DamageDealt]: 7 } }}
        onChange={onChange}
      />,
    )
    act(() => fireEvent.click(screen.getByRole("button", { name: /artillery/i })))
    expect(onChange).toHaveBeenCalledWith({ archetype: AiArchetype.Artillery })
  })

  it("moving a slider records only that axis as an override", () => {
    const onChange = vi.fn()
    render(<AiProfileEditor onChange={onChange} />)
    act(() => fireEvent.change(aggression(), { target: { value: "-3" } }))
    expect(onChange).toHaveBeenCalledWith({
      archetype: AiArchetype.Brawler,
      weights: { [AiScorer.DistanceToTarget]: -3 },
    })
  })

  it("returning an axis to its preset value drops the override entirely", () => {
    const onChange = vi.fn()
    const preset = ARCHETYPE_WEIGHTS[AiArchetype.Brawler][AiScorer.DistanceToTarget]
    render(
      <AiProfileEditor
        value={{ archetype: AiArchetype.Brawler, weights: { [AiScorer.DistanceToTarget]: -3 } }}
        onChange={onChange}
      />,
    )
    act(() => fireEvent.change(aggression(), { target: { value: String(preset) } }))
    // no `weights` key at all — the axis is inherited again, not pinned
    expect(onChange).toHaveBeenCalledWith({ archetype: AiArchetype.Brawler })
  })

  it("reset is inert until something is overridden, then clears everything", () => {
    const onChange = vi.fn()
    const { rerender } = render(<AiProfileEditor onChange={onChange} />)
    const reset = () => screen.getByRole("button", { name: /reset to preset/i }) as HTMLButtonElement
    expect(reset().disabled).toBe(true)

    rerender(
      <AiProfileEditor
        value={{ archetype: AiArchetype.Skirmisher, weights: { [AiScorer.DamageDealt]: 9 } }}
        onChange={onChange}
      />,
    )
    expect(reset().disabled).toBe(false)
    expect(screen.getByText(/1 changed/i)).toBeInTheDocument()

    act(() => fireEvent.click(reset()))
    expect(onChange).toHaveBeenCalledWith({ archetype: AiArchetype.Skirmisher })
  })
})
