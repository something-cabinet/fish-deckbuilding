// @vitest-environment jsdom
/**
 * TargetingArrow is a pure SVG renderer — test its valid/invalid states
 * directly (it only mounts inside fish-mafia-game during drag/arm).
 */
import "@testing-library/jest-dom/vitest"
import { cleanup, render } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

import { TargetingArrow } from "@/components/game/targeting-arrow"

afterEach(cleanup)

const base = { fromX: 100, fromY: 200, toX: 300, toY: 240 }

describe("TargetingArrow", () => {
  it("renders a gold arrow for a valid target", () => {
    const { container } = render(<TargetingArrow {...base} valid />)
    const svg = container.querySelector("svg")
    expect(svg).not.toBeNull()
    expect(svg).toHaveAttribute("aria-hidden", "true")
    expect(svg).toHaveStyle({ opacity: "1" })

    const core = container.querySelector("path.animate-fm-arrow-flow")
    expect(core).not.toBeNull()
    expect(core).toHaveAttribute("stroke", "var(--gold)")
  })

  it("renders a dim red arrow for an invalid target", () => {
    const { container } = render(<TargetingArrow {...base} valid={false} />)
    const core = container.querySelector("path.animate-fm-arrow-flow")
    expect(core).toHaveAttribute("stroke", "var(--enemy)")
    expect(container.querySelector("svg")).toHaveStyle({ opacity: "0.75" })
  })

  it("renders the origin nub and arrowhead", () => {
    const { container } = render(<TargetingArrow {...base} valid />)
    expect(container.querySelector("circle")).not.toBeNull()
    expect(container.querySelector("polygon")).not.toBeNull()
  })
})
