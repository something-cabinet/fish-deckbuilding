import { describe, expect, it } from "vitest"
import { createInitialState, EnemyStepKind, planEnemyTurn, rankCandidates } from "@/lib/game/battle"
import type { GameState } from "@/lib/game/battle"
import {
  AiArchetype,
  AiScorer,
  ARCHETYPE_WEIGHTS,
  DEFAULT_AI_PROFILE,
  Team,
  UnitKind,
  resolveAiWeights,
  unitBounty,
  type EnemyAiProfile,
  type Unit,
} from "@/lib/game/units"

function enemy(over: Partial<Unit> & { id: string }): Unit {
  return {
    name: "Thug",
    kind: UnitKind.Thug,
    team: Team.Enemy,
    pos: { x: 5, y: 2 },
    hp: 4,
    maxHp: 4,
    atk: 2,
    move: 2,
    range: 1,
    hasMoved: false,
    hasActed: false,
    buffAtk: 0,
    ...over,
  }
}

/** Board with exactly one hero and one enemy, so scores are easy to reason about. */
function duel(enemyOver: Partial<Unit> = {}, heroOver: Partial<Unit> = {}): GameState {
  const s = createInitialState()
  const hero = s.units.find((u) => u.id === "hero")!
  Object.assign(hero, { pos: { x: 1, y: 2 }, ...heroOver })
  s.units = [hero, enemy({ id: "enemy_0", ...enemyOver })]
  return s
}

describe("ai: weight resolution", () => {
  it("falls back to the brawler preset when no profile is authored", () => {
    expect(resolveAiWeights(undefined)).toEqual(ARCHETYPE_WEIGHTS[AiArchetype.Brawler])
    expect(DEFAULT_AI_PROFILE.archetype).toBe(AiArchetype.Brawler)
  })

  it("layers designer overrides on top of the archetype preset", () => {
    const profile: EnemyAiProfile = {
      archetype: AiArchetype.Brawler,
      weights: { [AiScorer.SelfPreservation]: 9 },
    }
    const w = resolveAiWeights(profile)
    expect(w[AiScorer.SelfPreservation]).toBe(9)
    // untouched axes still come from the preset
    expect(w[AiScorer.DamageDealt]).toBe(ARCHETYPE_WEIGHTS[AiArchetype.Brawler][AiScorer.DamageDealt])
  })
})

describe("ai: candidate enumeration", () => {
  it("always includes standing still, so a unit is never forced to act", () => {
    const s = duel({ pos: { x: 8, y: 4 } })
    const stay = rankCandidates(s, "enemy_0").filter(
      (c) => c.dest.x === 8 && c.dest.y === 4 && !c.targetId,
    )
    expect(stay).toHaveLength(1)
    expect(stay[0].path).toEqual([])
  })

  it("scores every axis on every candidate", () => {
    const [best] = rankCandidates(duel(), "enemy_0")
    for (const scorer of Object.values(AiScorer)) {
      expect(best.scores[scorer]).toBeTypeOf("number")
    }
  })

  it("returns candidates sorted best-first", () => {
    const ranked = rankCandidates(duel(), "enemy_0")
    const totals = ranked.map((c) => c.total)
    expect([...totals].sort((a, b) => b - a)).toEqual(totals)
  })

  it("returns nothing for a dead or unknown unit", () => {
    const s = duel({ hp: 0 })
    expect(rankCandidates(s, "enemy_0")).toEqual([])
    expect(rankCandidates(s, "nobody")).toEqual([])
  })
})

describe("ai: brawler reproduces chase-and-swing", () => {
  it("closes distance when it cannot reach the hero this turn", () => {
    const s = duel({ pos: { x: 8, y: 2 } }) // 7 tiles away, move 2
    const steps = planEnemyTurn(s)
    expect(steps).toHaveLength(2)
    expect(steps.every((st) => st.kind === EnemyStepKind.Move)).toBe(true)
    expect(steps[1].to).toEqual({ x: 6, y: 2 })
  })

  it("attacks without moving when already adjacent", () => {
    const s = duel({ pos: { x: 2, y: 2 } })
    const steps = planEnemyTurn(s)
    expect(steps).toHaveLength(1)
    expect(steps[0]).toMatchObject({
      kind: EnemyStepKind.Attack,
      unitId: "enemy_0",
      targetId: "hero",
      amount: 2,
    })
  })

  it("moves into range and attacks in the same turn", () => {
    const s = duel({ pos: { x: 4, y: 2 } }) // 3 away, move 2 → ends adjacent
    const steps = planEnemyTurn(s)
    expect(steps.at(-1)).toMatchObject({ kind: EnemyStepKind.Attack, targetId: "hero" })
    expect(steps.filter((st) => st.kind === EnemyStepKind.Move)).toHaveLength(2)
  })

  it("attacks at range without needing adjacency", () => {
    const s = duel({ pos: { x: 6, y: 2 }, range: 9, move: 2 })
    const steps = planEnemyTurn(s)
    // a brawler still closes — the preset pays for proximity — but the kill
    // no longer waits on adjacency
    expect(steps.at(-1)).toMatchObject({ kind: EnemyStepKind.Attack, targetId: "hero" })
  })
})

describe("ai: weights change behaviour without code", () => {
  it("artillery kites to the far edge instead of closing", () => {
    const base = { pos: { x: 6, y: 2 }, range: 9, move: 2 }
    const brawler = planEnemyTurn(duel(base))
    const artillery = planEnemyTurn(
      duel({ ...base, aiProfile: { archetype: AiArchetype.Artillery } }),
    )
    // same unit, same board, opposite movement — the only difference is data
    const approach = brawler.filter((st) => st.kind === EnemyStepKind.Move)
    const retreat = artillery.filter((st) => st.kind === EnemyStepKind.Move)
    expect(approach.at(-1)!.to!.x).toBe(4)
    expect(retreat.at(-1)!.to!.x).toBe(8)
    // and both still land the shot
    expect(brawler.at(-1)!.kind).toBe(EnemyStepKind.Attack)
    expect(artillery.at(-1)!.kind).toBe(EnemyStepKind.Attack)
  })

  it("lethal on the hero outranks a safer, larger-damage alternative", () => {
    const s = duel({ pos: { x: 2, y: 2 }, atk: 2 }, { hp: 2 })
    // a juicier non-hero target sits equally close
    s.units.push(
      enemy({ id: "ally_0", team: Team.Player, pos: { x: 3, y: 2 }, hp: 1, name: "Minnow" }),
    )
    const [best] = rankCandidates(s, "enemy_0")
    expect(best.targetId).toBe("hero")
    expect(best.scores[AiScorer.LethalOnHero]).toBe(1)
  })

  it("a self-preservation override pulls a unit off a threatened tile", () => {
    const timid: EnemyAiProfile = {
      archetype: AiArchetype.Brawler,
      weights: { [AiScorer.SelfPreservation]: 50 },
    }
    const s = duel({ pos: { x: 3, y: 2 }, aiProfile: timid }, { atk: 5, move: 2 })
    const [best] = rankCandidates(s, "enemy_0")
    expect(best.dest.x).toBeGreaterThan(3)
    expect(best.targetId).toBeUndefined()
  })
})

describe("ai: multi-unit planning", () => {
  it("is deterministic across repeated runs", () => {
    const s = createInitialState()
    expect(planEnemyTurn(s)).toEqual(planEnemyTurn(s))
  })

  it("never routes two units onto the same tile", () => {
    const s = createInitialState()
    const steps = planEnemyTurn(s)
    const dest = new Map<string, string>()
    for (const st of steps) {
      if (st.kind !== EnemyStepKind.Move || !st.to) continue
      dest.set(st.unitId, `${st.to.x},${st.to.y}`)
    }
    const finals = [...dest.values()]
    expect(new Set(finals).size).toBe(finals.length)
  })

  it("acts in descending bounty order, so the boss claims its tile first", () => {
    const s = duel({ pos: { x: 8, y: 2 } })
    s.units.push(
      enemy({ id: "enemy_boss", kind: UnitKind.Boss, hp: 16, atk: 4, pos: { x: 8, y: 3 } }),
    )
    const order = planEnemyTurn(s).map((st) => st.unitId)
    expect(order.indexOf("enemy_boss")).toBeLessThan(order.indexOf("enemy_0"))
    expect(unitBounty(s.units.find((u) => u.id === "enemy_boss")!)).toBeGreaterThan(
      unitBounty(s.units.find((u) => u.id === "enemy_0")!),
    )
  })

  it("stops planning once no player unit is left standing", () => {
    const s = createInitialState()
    s.units = s.units.filter((u) => u.team === Team.Enemy)
    expect(planEnemyTurn(s)).toEqual([])
  })
})
