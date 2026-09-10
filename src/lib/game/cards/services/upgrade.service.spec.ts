import { describe, expect, it } from "vitest"
import { CARD_LIBRARY } from "@/lib/game"
import { applyCardUpgrade } from "@/lib/game/cards"

describe("applyCardUpgrade", () => {
  it("returns the same def unchanged at level 0", () => {
    const def = CARD_LIBRARY.demand_letter
    expect(applyCardUpgrade(def, 0)).toBe(def)
  })

  it("bumps damage amounts by level", () => {
    const def = CARD_LIBRARY.demand_letter
    const u = applyCardUpgrade(def, 2)
    expect(u.name).toBe("Demand Letter +2")
    expect(u.value).toBe(def.value + 2)
    const dmg = u.effects.find((e) => e.kind === "damage")
    expect(dmg).toBeDefined()
    if (dmg && dmg.kind === "damage") expect(dmg.amount).toBe(2 + 2)
  })

  it("bumps both damage and heal amounts (loan_shark)", () => {
    const def = CARD_LIBRARY.loan_shark
    const u = applyCardUpgrade(def, 1)
    const dmg = u.effects.find((e) => e.kind === "damage")
    const heal = u.effects.find((e) => e.kind === "heal")
    if (dmg && dmg.kind === "damage") expect(dmg.amount).toBe(5)
    if (heal && heal.kind === "heal") expect(heal.amount).toBe(3)
  })

  it("does not bump gainCoin or drawCards", () => {
    const def = CARD_LIBRARY.cash_flow
    const u = applyCardUpgrade(def, 3)
    const coin = u.effects.find((e) => e.kind === "gainCoin")
    if (coin && coin.kind === "gainCoin") expect(coin.amount).toBe(3)
  })

  it("clones the def so the original library entry is not mutated", () => {
    const orig = CARD_LIBRARY.demand_letter
    const u = applyCardUpgrade(orig, 1)
    expect(u.effects).not.toBe(orig.effects)
    expect(orig.effects[0]).toBe(CARD_LIBRARY.demand_letter.effects[0])
  })
})