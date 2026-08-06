// @vitest-environment jsdom
/**
 * ParticleCanvas: the fx handler switch runs for every FxKind on mount.
 * Exercises the full visual-effect vocabulary without crashing in jsdom.
 */
import "@testing-library/jest-dom/vitest"
import { cleanup, render } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

import { installJsdomShims } from "./test-utils"
import { ParticleCanvas } from "@/components/game/particle-canvas"
import { FxKind, type FxEvent } from "@/lib/game/battle"

installJsdomShims()

afterEach(cleanup)

const to = { x: 3, y: 2 }
const from = { x: 1, y: 2 }

describe("ParticleCanvas", () => {
  it("processes every fx kind without throwing", () => {
    const kinds = [
      FxKind.Letter,
      FxKind.Phone,
      FxKind.Gavel,
      FxKind.Shock,
      FxKind.Melee,
      FxKind.Coin,
      FxKind.Heal,
      FxKind.Draw,
      FxKind.Summon,
      FxKind.Move,
      FxKind.Death,
    ]
    const fx: FxEvent[] = kinds.map((kind, i) => ({
      id: i + 1,
      kind,
      from,
      to,
      amount: kind === FxKind.Coin || kind === FxKind.Heal ? 2 : 5,
    }))

    const { container } = render(<ParticleCanvas fx={fx} cols={9} rows={5} />)
    expect(container.querySelector("canvas")).not.toBeNull()
  })

  it("renders an empty canvas when no fx events are supplied", () => {
    const { container } = render(<ParticleCanvas fx={[]} cols={9} rows={5} />)
    expect(container.querySelector("canvas")).not.toBeNull()
  })
})
