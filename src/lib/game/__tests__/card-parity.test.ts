import { describe, expect, it } from "vitest"
import {
  canCast,
  cardTargets,
  castCard,
  createInitialState,
  posKey,
  startGame,
} from "@/lib/game/services"
import { CARD_LIBRARY } from "@/lib/game"
import type { CardInstance } from "@/lib/game/cards"
import type { GameState } from "@/lib/game/battle"

/* ------------------------------------------------------------------ */
/* helpers                                                             */
/* ------------------------------------------------------------------ */

function fresh(): GameState {
  // deterministic initial state, no shuffle side effects
  return createInitialState()
}

function withHand(state: GameState, libIds: string[]): GameState {
  const hand: CardInstance[] = libIds.map((id, i) => ({
    uid: `c_test_${i}`,
    def: CARD_LIBRARY[id],
  }))
  // grant ample mana so the card under test is castable
  return { ...state, mana: 10, maxMana: 10, hand }
}

function cast(
  state: GameState,
  libId: string,
  target?: { unitId?: string; tile?: { x: number; y: number } },
) {
  const card = state.hand.find((c) => c.def.id === libId)
  if (!card) throw new Error(`no hand card for ${libId}`)
  return castCard(state, card.uid, target ?? {})
}

/** Find the first living unit of a team. */
function unitByTeam(state: GameState, team: "player" | "enemy") {
  const u = state.units.find((x) => x.team === team && x.hp > 0)
  if (!u) throw new Error(`no living ${team} unit`)
  return u
}

/** Find the hero unit (id === "hero"). */
function hero(state: GameState) {
  const u = state.units.find((x) => x.id === "hero")
  if (!u) throw new Error("no hero")
  return u
}

/* ------------------------------------------------------------------ */
/* parity oracle — captures CURRENT castCard behavior (switch at       */
/* engine.ts ~328). Must pass against the current implementation;     */
/* becomes the regression baseline for the effect-registry refactor.  */
/* ------------------------------------------------------------------ */

describe("card parity: demand_letter", () => {
  it("deals 2 damage, pays cost, discards card, logs + fx in order", () => {
    const s = withHand(fresh(), ["demand_letter"])
    const enemy = unitByTeam(s, "enemy")
    const manaBefore = s.mana
    const cost = CARD_LIBRARY.demand_letter.cost

    const { state, fx } = cast(s, "demand_letter", { unitId: enemy.id })

    expect(state).not.toBe(s) // success clones
    expect(state.mana).toBe(manaBefore - cost)
    expect(state.spentCount).toBe(1)
    expect(state.hand.some((c) => c.def.id === "demand_letter")).toBe(false)
    expect(state.discard.map((c) => c.def.id)).toContain("demand_letter")
    const after = state.units.find((u) => u.id === enemy.id)!
    expect(after.hp).toBe(enemy.hp - 2)

    // fx order: card fx first (letter), then dealDamage shock
    expect(fx.map((e) => e.kind)).toEqual(["letter", "shock"])
    expect(fx[1].amount).toBe(2)
    expect(fx[1].to).toEqual(enemy.pos)

    const last = state.log[state.log.length - 1]
    expect(last.text).toBe(`Demand Letter hits ${enemy.name} for 2.`)
    expect(last.tone).toBe("good")
  })
})

describe("card parity: collection_call", () => {
  it("deals 3 damage, pays cost, logs + fx", () => {
    const s = withHand(fresh(), ["collection_call"])
    const enemy = unitByTeam(s, "enemy")
    const manaBefore = s.mana
    const cost = CARD_LIBRARY.collection_call.cost

    const { state, fx } = cast(s, "collection_call", { unitId: enemy.id })

    expect(state.mana).toBe(manaBefore - cost)
    const after = state.units.find((u) => u.id === enemy.id)!
    expect(after.hp).toBe(enemy.hp - 3)
    expect(fx.map((e) => e.kind)).toEqual(["phone", "shock"])
    expect(fx[1].amount).toBe(3)
    expect(state.log[state.log.length - 1].text).toBe(
      `Collection Call rattles ${enemy.name} for 3.`,
    )
  })
})

describe("card parity: foreclose", () => {
  it("deals 6 damage, pays cost, logs + fx", () => {
    const s = withHand(fresh(), ["foreclose"])
    // target a survivor (Boss, 16 HP) — a Thug would die to 6 damage
    const enemy = s.units.find((u) => u.kind === "boss")!
    const manaBefore = s.mana
    const cost = CARD_LIBRARY.foreclose.cost

    const { state, fx } = cast(s, "foreclose", { unitId: enemy.id })

    expect(state.mana).toBe(manaBefore - cost)
    const after = state.units.find((u) => u.id === enemy.id)!
    expect(after.hp).toBe(Math.max(0, enemy.hp - 6))
    expect(fx.map((e) => e.kind)).toEqual(["gavel", "shock"])
    expect(fx[1].amount).toBe(6)
    expect(state.log[state.log.length - 1].text).toBe(
      `Foreclose slams ${enemy.name} for 6!`,
    )
  })

  it("kills a 4 HP Thug, removes it via cleanupDead, logs death", () => {
    const s = withHand(fresh(), ["foreclose"])
    const thug = s.units.find((u) => u.kind === "thug")!
    const { state, fx } = cast(s, "foreclose", { unitId: thug.id })

    expect(state.units.find((u) => u.id === thug.id)).toBeUndefined()
    const deathFx = fx.find((e) => e.kind === "death")
    expect(deathFx).toBeDefined()
    expect(deathFx!.to).toEqual(thug.pos)
    const log = state.log.map((l) => l.text)
    expect(log.some((t) => t.includes("wiped off the ledger"))).toBe(true)
  })
})

describe("card parity: kneecap", () => {
  it("deals 2 damage AND -1 buffAtk, fx order: shock, shock(2)", () => {
    const s = withHand(fresh(), ["kneecap"])
    const enemy = unitByTeam(s, "enemy")
    const manaBefore = s.mana
    const cost = CARD_LIBRARY.kneecap.cost

    const { state, fx } = cast(s, "kneecap", { unitId: enemy.id })

    expect(state.mana).toBe(manaBefore - cost)
    const after = state.units.find((u) => u.id === enemy.id)!
    expect(after.hp).toBe(enemy.hp - 2)
    expect(after.buffAtk).toBe(enemy.buffAtk - 1)
    // two shock events: card fx, then dealDamage
    expect(fx.map((e) => e.kind)).toEqual(["shock", "shock"])
    expect(fx[1].amount).toBe(2)
    expect(state.log[state.log.length - 1].text).toBe(
      `Kneecap hits ${enemy.name} for 2 and weakens it.`,
    )
  })
})

describe("card parity: loan_shark", () => {
  it("deals 4 damage and heals hero 2, fx order: shock, shock(4), heal", () => {
    const s = withHand(fresh(), ["loan_shark"])
    // target a survivor (Enforcer, 6 HP) — a Thug would die to 4 damage
    const enemy = s.units.find((u) => u.kind === "enforcer")!
    const h = hero(s)
    const hpHeroBefore = h.hp
    const manaBefore = s.mana
    const cost = CARD_LIBRARY.loan_shark.cost

    const { state, fx } = cast(s, "loan_shark", { unitId: enemy.id })

    expect(state.mana).toBe(manaBefore - cost)
    const after = state.units.find((u) => u.id === enemy.id)!
    expect(after.hp).toBe(enemy.hp - 4)
    const heroAfter = state.units.find((u) => u.id === "hero")!
    expect(heroAfter.hp).toBe(Math.min(h.maxHp, hpHeroBefore + 2))
    expect(fx.map((e) => e.kind)).toEqual(["shock", "shock", "heal"])
    expect(fx[1].amount).toBe(4)
    expect(fx[2].amount).toBe(2)
    expect(fx[2].to).toEqual(heroAfter.pos)
    expect(state.log[state.log.length - 1].text).toBe(
      `Loan Shark drains ${enemy.name} for 4, heals Guppy 2.`,
    )
  })

  it("caps hero heal at maxHp", () => {
    const s = withHand(fresh(), ["loan_shark"])
    const enemy = unitByTeam(s, "enemy")
    const h = hero(s)
    h.hp = h.maxHp // already full

    const { state } = cast(s, "loan_shark", { unitId: enemy.id })
    const heroAfter = state.units.find((u) => u.id === "hero")!
    expect(heroAfter.hp).toBe(h.maxHp)
  })
})

describe("card parity: cash_flow", () => {
  it("gains 3 coin, self target, logs + fx", () => {
    const s = withHand(fresh(), ["cash_flow"])
    const coinBefore = s.coin
    const h = hero(s)
    const manaBefore = s.mana
    const cost = CARD_LIBRARY.cash_flow.cost

    const { state, fx } = cast(s, "cash_flow")

    expect(state.mana).toBe(manaBefore - cost)
    expect(state.coin).toBe(coinBefore + 3)
    expect(fx.map((e) => e.kind)).toEqual(["coin"])
    expect(fx[0].amount).toBe(3)
    expect(fx[0].to).toEqual(h.pos)
    expect(state.log[state.log.length - 1].text).toBe("Cash Flow launders 3 coin.")
    expect(state.log[state.log.length - 1].tone).toBe("gold")
  })
})

describe("card parity: market_rate", () => {
  it("draws 2 cards, self target, logs + fx", () => {
    const s = withHand(fresh(), ["market_rate"])
    const handBefore = s.hand.length
    const deckBefore = s.deck.length
    const h = hero(s)
    const manaBefore = s.mana
    const cost = CARD_LIBRARY.market_rate.cost

    const { state, fx } = cast(s, "market_rate")

    expect(state.mana).toBe(manaBefore - cost)
    // the cast card left hand (played), then 2 drawn
    expect(state.hand.length).toBe(handBefore - 1 + 2)
    expect(state.deck.length).toBe(deckBefore - 2)
    expect(fx.map((e) => e.kind)).toEqual(["draw"])
    expect(fx[0].to).toEqual(h.pos)
    expect(state.log[state.log.length - 1].text).toBe("Market Rate draws 2 cards.")
    expect(state.log[state.log.length - 1].tone).toBe("neutral")
  })
})

describe("card parity: hush_money", () => {
  it("heals an ally 5, capped at maxHp, logs + fx", () => {
    const s = withHand(fresh(), ["hush_money"])
    const h = hero(s) // hero is an ally
    h.hp = Math.max(0, h.maxHp - 7) // wounded
    const hpBefore = h.hp
    const manaBefore = s.mana
    const cost = CARD_LIBRARY.hush_money.cost

    const { state, fx } = cast(s, "hush_money", { unitId: h.id })

    expect(state.mana).toBe(manaBefore - cost)
    const heroAfter = state.units.find((u) => u.id === "hero")!
    expect(heroAfter.hp).toBe(Math.min(h.maxHp, hpBefore + 5))
    expect(fx.map((e) => e.kind)).toEqual(["heal"])
    expect(fx[0].amount).toBe(5)
    expect(fx[0].to).toEqual(h.pos)
    expect(state.log[state.log.length - 1].text).toBe(
      `Hush Money patches up ${h.name} for 5.`,
    )
  })
})

describe("card parity: muscle (Hired Muscle)", () => {
  it("summons a Goon (5/2/move2, acted) on an empty tile", () => {
    const s = withHand(fresh(), ["muscle"])
    const empty = { x: 0, y: 0 } // no unit starts there (hero at 1,2)
    const manaBefore = s.mana
    const cost = CARD_LIBRARY.muscle.cost
    const unitsBefore = s.units.length

    const { state, fx } = cast(s, "muscle", { tile: empty })

    expect(state.mana).toBe(manaBefore - cost)
    expect(state.units.length).toBe(unitsBefore + 1)
    const goon = state.units.find((u) => u.kind === "goon")!
    expect(goon.team).toBe("player")
    expect(goon.pos).toEqual(empty)
    expect(goon.hp).toBe(5)
    expect(goon.maxHp).toBe(5)
    expect(goon.atk).toBe(2)
    expect(goon.move).toBe(2)
    expect(goon.hasMoved).toBe(true)
    expect(goon.hasActed).toBe(true)
    expect(fx.map((e) => e.kind)).toEqual(["summon"])
    expect(fx[0].to).toEqual(empty)
    expect(state.log[state.log.length - 1].text).toBe(
      `Hired Muscle joins at ${posKey(empty) === "0,0" ? "A1" : posKey(empty)}.`,
    )
  })
})

/* ------------------------------------------------------------------ */
/* validation rejects — unchanged state, no fx, no log                 */
/* ------------------------------------------------------------------ */

describe("card parity: invalid target rejected", () => {
  it("enemy-target card cast at an ally returns unchanged state", () => {
    const s = withHand(fresh(), ["demand_letter"])
    const ally = hero(s)
    const manaBefore = s.mana
    const handBefore = s.hand.length
    const logBefore = s.log.length

    const { state, fx } = cast(s, "demand_letter", { unitId: ally.id })

    expect(state).toBe(s) // same reference — not cloned
    expect(state.mana).toBe(manaBefore)
    expect(state.hand.length).toBe(handBefore)
    expect(state.log.length).toBe(logBefore)
    expect(fx).toEqual([])
  })

  it("summon cast on an occupied tile returns unchanged state", () => {
    const s = withHand(fresh(), ["muscle"])
    const enemy = unitByTeam(s, "enemy")
    const manaBefore = s.mana

    const { state, fx } = cast(s, "muscle", { tile: enemy.pos })

    expect(state).toBe(s)
    expect(state.mana).toBe(manaBefore)
    expect(fx).toEqual([])
  })
})

describe("card parity: insufficient mana rejected", () => {
  it("cost above mana returns unchanged state", () => {
    const s = withHand(fresh(), ["foreclose"]) // cost 4
    s.mana = 3
    const enemy = unitByTeam(s, "enemy")
    const handBefore = s.hand.length
    const logBefore = s.log.length

    const { state, fx } = cast(s, "foreclose", { unitId: enemy.id })

    expect(state).toBe(s)
    expect(state.mana).toBe(3)
    expect(state.hand.length).toBe(handBefore)
    expect(state.log.length).toBe(logBefore)
    expect(fx).toEqual([])
  })
})

describe("card parity: canCast phase + cost", () => {
  it("canCast requires player phase and enough mana", () => {
    const s = withHand(fresh(), ["demand_letter"])
    const card = s.hand[0]
    expect(canCast(s, card)).toBe(true)
    s.mana = 0
    expect(canCast(s, card)).toBe(false)
    s.mana = 1
    s.phase = "enemy"
    expect(canCast(s, card)).toBe(false)
  })
})

describe("card parity: cardTargets by target kind", () => {
  it("enemy target lists living enemy unit ids", () => {
    const s = withHand(fresh(), ["demand_letter"])
    const card = s.hand[0]
    const t = cardTargets(s, card)
    expect(t.unitIds.length).toBeGreaterThan(0)
    for (const id of t.unitIds) {
      const u = s.units.find((x) => x.id === id)!
      expect(u.team).toBe("enemy")
      expect(u.hp).toBeGreaterThan(0)
    }
    expect(t.tiles).toEqual([])
  })

  it("self target has no units or tiles", () => {
    const s = withHand(fresh(), ["cash_flow"])
    const card = s.hand[0]
    const t = cardTargets(s, card)
    expect(t.unitIds).toEqual([])
    expect(t.tiles).toEqual([])
  })
})
