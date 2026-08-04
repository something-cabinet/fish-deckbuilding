import { describe, expect, it } from "vitest"

import { STARTER_DECK } from "@/lib/game"
import { createInitialState } from "@/lib/game/battle"
import { posKey } from "@/lib/game/shared"
import { Phase } from "@/lib/game/battle"

describe("engine smoke", () => {
  it("createInitialState returns a fresh game at turn 1 in the player phase", () => {
    const state = createInitialState()
    expect(state.turn).toBe(1)
    expect(state.phase).toBe(Phase.Player)
  })

  it("starts with 6 units (hero + 5 enemies), the full starter deck, and an empty hand", () => {
    const state = createInitialState()
    expect(state.units).toHaveLength(6)
    expect(state.deck).toHaveLength(STARTER_DECK.length)
    expect(state.hand).toHaveLength(0)
  })

  it("posKey formats a position as x,y", () => {
    expect(posKey({ x: 1, y: 2 })).toBe("1,2")
  })
})
