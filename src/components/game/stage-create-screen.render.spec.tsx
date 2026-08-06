// @vitest-environment jsdom
/**
 * StageCreateScreen: the grid places and clears enemies, resizing prunes
 * placements that fall off the board, and Save is gated on a name.
 */
import "@testing-library/jest-dom/vitest"
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { UnitKind, type EnemyDef } from "@/lib/game/units"
import { StageCreateScreen } from "@/components/game/stage-create-screen"

afterEach(cleanup)

const thug: EnemyDef = {
  id: "thug",
  name: "Thug",
  kind: UnitKind.Thug,
  hp: 10,
  atk: 2,
  move: 2,
  range: 1,
  goldDrop: 5,
  isMinion: false,
  icon: "thug",
  deck: [],
}

function renderScreen(props: Partial<Parameters<typeof StageCreateScreen>[0]> = {}) {
  return render(
    <StageCreateScreen
      enemies={[thug]}
      onBack={() => {}}
      onSave={() => {}}
      {...props}
    />,
  )
}

/** The editor grid and the preview both render tiles; the editor's are buttons. */
function tile(label: string) {
  return screen.getByRole("button", { name: new RegExp(`^${label}:`) })
}

/** Tool buttons are named exactly; tile labels are prefixed with their ref. */
function tool(name: string | RegExp) {
  return screen.getByRole("button", { name })
}

describe("StageCreateScreen", () => {
  it("Save is disabled until the stage is named", () => {
    renderScreen()
    const save = screen.getByRole("button", { name: /^save$/i }) as HTMLButtonElement
    expect(save.disabled).toBe(true)

    act(() => fireEvent.change(screen.getByPlaceholderText(/reef ambush/i), { target: { value: "Ambush" } }))
    expect((screen.getByRole("button", { name: /^save$/i }) as HTMLButtonElement).disabled).toBe(false)
  })

  it("places the armed enemy on a clicked tile and clears it with Erase", () => {
    renderScreen()
    // the thug tool is armed by default (first enemy)
    act(() => fireEvent.click(tile("G2")))
    expect(tile("G2").getAttribute("aria-label")).toMatch(/thug/i)

    act(() => fireEvent.click(tool("Erase")))
    act(() => fireEvent.click(tile("G2")))
    expect(tile("G2").getAttribute("aria-label")).toMatch(/empty/i)
  })

  it("moves the hero start and refuses to bury it under an enemy", () => {
    renderScreen()
    act(() => fireEvent.click(tool("Hero start")))
    act(() => fireEvent.click(tile("C1")))
    expect(tile("C1").getAttribute("aria-label")).toMatch(/hero start/i)

    // arming the thug and clicking the hero tile must not displace the spawn
    act(() => fireEvent.click(tool(/^Thug ·/)))
    act(() => fireEvent.click(tile("C1")))
    expect(tile("C1").getAttribute("aria-label")).toMatch(/hero start/i)
  })

  it("drops placements that fall outside a shrunken grid", () => {
    const onSave = vi.fn()
    renderScreen({ onSave })
    act(() => fireEvent.change(screen.getByPlaceholderText(/reef ambush/i), { target: { value: "Ambush" } }))
    act(() => fireEvent.click(tile("I5")))

    // 9 -> 4 columns leaves I (x=8) off the board
    for (let i = 0; i < 5; i++) {
      act(() => fireEvent.click(tool(/decrease width/i)))
    }
    act(() => fireEvent.click(screen.getByRole("button", { name: /^save$/i })))

    expect(onSave).toHaveBeenCalledTimes(1)
    const def = onSave.mock.calls[0][0]
    expect(def.cols).toBe(4)
    expect(def.placements).toEqual([])
  })

  it("saves the zone and stage type it was created with", () => {
    const onSave = vi.fn()
    renderScreen({ initialZone: "depths", onSave })
    act(() => fireEvent.change(screen.getByPlaceholderText(/reef ambush/i), { target: { value: "Deep Ambush" } }))
    act(() => fireEvent.click(tool("Boss")))
    act(() => fireEvent.click(tool(/^save$/i)))

    const def = onSave.mock.calls[0][0]
    expect(def.zone).toBe("depths")
    expect(def.type).toBe("boss")
    expect(def.id).toMatch(/^stage_deep_ambush_/)
  })

  it("offers all three pools and defaults to normal", () => {
    const onSave = vi.fn()
    renderScreen({ onSave })
    expect(tool("Normal")).toHaveAttribute("aria-pressed", "true")
    expect(tool("Elite")).toHaveAttribute("aria-pressed", "false")
    expect(tool("Boss")).toHaveAttribute("aria-pressed", "false")

    act(() => fireEvent.click(tool("Elite")))
    act(() => fireEvent.change(screen.getByPlaceholderText(/reef ambush/i), { target: { value: "Ambush" } }))
    act(() => fireEvent.click(tool(/^save$/i)))
    expect(onSave.mock.calls[0][0].type).toBe("elite")
  })

  it("opens an existing stage on its own type", () => {
    renderScreen({
      editStage: {
        id: "s1",
        name: "Elite Reef",
        zone: "shallows",
        cols: 9,
        rows: 5,
        type: "elite",
        heroStart: { x: 1, y: 2 },
        placements: [],
      },
    })
    expect(tool("Elite")).toHaveAttribute("aria-pressed", "true")
  })
})
