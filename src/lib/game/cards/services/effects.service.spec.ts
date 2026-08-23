import { describe, expect, it } from "vitest"
import { createInitialState } from "@/lib/game/battle"
import { resolveCardEffects } from "@/lib/game/cards"
import { heroUnit } from "@/lib/game/shared"
import { CARD_LIBRARY } from "@/lib/game"
import { FxKind, type FxEvent, type GameState } from "@/lib/game/battle"
import { Team, UnitKind, type Unit } from "@/lib/game/units"

function fresh(): GameState {
  return createInitialState()
}

function enemyOf(state: GameState): Unit {
  const u = state.units.find((x) => x.team === Team.Enemy && x.hp > 0)
  if (!u) throw new Error("no enemy")
  return u
}

describe("resolver: exhaustive effect application", () => {
  it("damage effect mutates target HP and pushes shock fx", () => {
    const s = fresh()
    const target = enemyOf(s)
    const hpBefore = target.hp
    const fx: FxEvent[] = []
    const card = CARD_LIBRARY.demand_letter

    resolveCardEffects(s, card, { targetUnits: [target], from: heroUnit(s)?.pos }, fx)

    const after = s.units.find((u) => u.id === target.id)!
    expect(after.hp).toBe(hpBefore - 2)
    expect(fx.map((e) => e.kind)).toEqual([FxKind.Letter, FxKind.Shock])
    expect(fx[1].amount).toBe(2)
  })

  it("multi-effect card applies effects in declared order (kneecap)", () => {
    const s = fresh()
    const target = enemyOf(s)
    const hpBefore = target.hp
    const buffBefore = target.buffAtk
    const fx: FxEvent[] = []
    const card = CARD_LIBRARY.kneecap

    resolveCardEffects(s, card, { targetUnits: [target], from: heroUnit(s)?.pos }, fx)

    const after = s.units.find((u) => u.id === target.id)!
    expect(after.hp).toBe(hpBefore - 2)
    expect(after.buffAtk).toBe(buffBefore - 1)
    expect(fx.map((e) => e.kind)).toEqual([FxKind.Shock, FxKind.Shock])
  })

  it("heal with target caster heals the hero (loan_shark)", () => {
    const s = fresh()
    // target a survivor (Boss, 16 HP) — a Thug would die to 4 damage
    const target = s.units.find((u) => u.kind === UnitKind.Boss)!
    const h = heroUnit(s)!
    h.hp = h.maxHp - 1
    const fx: FxEvent[] = []
    const card = CARD_LIBRARY.loan_shark

    resolveCardEffects(s, card, { targetUnits: [target], from: h.pos }, fx)

    const heroAfter = heroUnit(s)!
    expect(heroAfter.hp).toBe(h.maxHp) // 13 + 2 capped at 14
    expect(fx.map((e) => e.kind)).toEqual([FxKind.Shock, FxKind.Shock, FxKind.Heal])
  })

  it("heal with target cast-target heals the targeted unit (hush_money)", () => {
    const s = fresh()
    const h = heroUnit(s)!
    h.hp = Math.max(0, h.maxHp - 7)
    const hpBefore = h.hp
    const fx: FxEvent[] = []
    const card = CARD_LIBRARY.hush_money

    resolveCardEffects(s, card, { targetUnits: [h], from: h.pos }, fx)

    const heroAfter = heroUnit(s)!
    expect(heroAfter.hp).toBe(hpBefore + 5)
    expect(fx.map((e) => e.kind)).toEqual([FxKind.Heal])
  })

  it("gainCoin adds coin and pushes a coin fx", () => {
    const s = fresh()
    const h = heroUnit(s)!
    const fx: FxEvent[] = []
    const card = CARD_LIBRARY.cash_flow

    resolveCardEffects(s, card, { from: h.pos }, fx)

    expect(s.coin).toBe(3)
    expect(fx.map((e) => e.kind)).toEqual([FxKind.Coin])
    expect(fx[0].amount).toBe(3)
  })

  it("drawCards draws from the deck and pushes a draw fx", () => {
    const s = fresh()
    const h = heroUnit(s)!
    const deckBefore = s.deck.length
    const fx: FxEvent[] = []
    const card = CARD_LIBRARY.market_rate

    resolveCardEffects(s, card, { from: h.pos }, fx)

    expect(s.deck.length).toBe(deckBefore - 2)
    expect(fx.map((e) => e.kind)).toEqual([FxKind.Draw])
  })

  it("summon spawns a Goon on the tile", () => {
    const s = fresh()
    const fx: FxEvent[] = []
    const card = CARD_LIBRARY.muscle
    const tile = { x: 0, y: 0 }

    resolveCardEffects(s, card, { tile }, fx)

    const goon = s.units.find((u) => u.kind === UnitKind.Goon)
    expect(goon).toBeDefined()
    expect(goon!.pos).toEqual(tile)
    expect(goon!.hp).toBe(5)
    expect(goon!.hasActed).toBe(true)
    expect(fx.map((e) => e.kind)).toEqual([FxKind.Summon])
  })

  it("logs the card resolution line with interpolation", () => {
    const s = fresh()
    const target = enemyOf(s)
    const fx: FxEvent[] = []
    const card = CARD_LIBRARY.demand_letter

    resolveCardEffects(s, card, { targetUnits: [target], from: heroUnit(s)?.pos }, fx)

    const last = s.log[s.log.length - 1]
    expect(last.text).toBe(`Demand Letter hits ${target.name} for 2.`)
    expect(last.tone).toBe("good")
  })
})

describe("resolver: fx ids are unique per emission (D3)", () => {
  it("multi-fx cards emit events with distinct engine-issued ids", () => {
    const s = fresh()
    const target = enemyOf(s)
    const fx: FxEvent[] = []
    const card = CARD_LIBRARY.kneecap

    resolveCardEffects(s, card, { targetUnits: [target], from: heroUnit(s)?.pos }, fx)

    expect(fx.length).toBeGreaterThan(1)
    const ids = fx.map((e) => e.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})
