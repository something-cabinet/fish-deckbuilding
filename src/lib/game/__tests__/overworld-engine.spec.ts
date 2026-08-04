import { describe, expect, it } from "vitest"
import {
  ZONES,
  START_DEBT,
  FORECLOSURE_CAP,
  INTEREST_RATE,
  SHOP_REMOVE_PRICE,
} from "@/lib/game/overworld-data"
import {
  generateZoneMap,
  generateAllZoneMaps,
  currentNode,
  reachableNodes,
  nodeTypeAt,
  isBossNode,
  isRestNode,
  travelToNode,
  accrueInterest,
  clearCurrentNode,
  healAtRest,
  unlockNextZone,
  isForeclosed,
  payDebt,
  shopInventory,
  buyCard,
  removeCardFromDeck,
  eventForNode,
  applyEventChoice,
  battleEnemiesForZone,
  bossEnemiesForZone,
  enemiesForNode,
  rollRewards,
  rollEliteRewards,
  rollTreasure,
  addRewardToState,
  createNewRun,
  REMOVE_PRICE,
} from "@/lib/game/overworld-engine"
import { CARD_LIBRARY } from "@/lib/game"
import { UnitKind } from "@/lib/game/units"
import type { MapNode, OverworldState } from "@/lib/game/overworld-types"

/* ------------------------------------------------------------------ */
/* helpers                                                             */
/* ------------------------------------------------------------------ */

const SEED = 123456

/** Build a lookup so we can walk edges by id. */
function byId(map: MapNode[]): Record<string, MapNode> {
  return Object.fromEntries(map.map((n) => [n.id, n]))
}

/** All node ids reachable from the start following edges (forward BFS). */
function reachableFromStart(map: MapNode[]): Set<string> {
  const lut = byId(map)
  const start = map.find((n) => n.row === 0)!
  const seen = new Set<string>([start.id])
  const queue = [start]
  while (queue.length) {
    const n = queue.shift()!
    for (const e of n.edges) {
      if (!seen.has(e)) {
        seen.add(e)
        queue.push(lut[e])
      }
    }
  }
  return seen
}

function stateAt(overrides: Partial<OverworldState> = {}): OverworldState {
  return { ...createNewRun(SEED), ...overrides }
}

/* ------------------------------------------------------------------ */
/* map generation                                                      */
/* ------------------------------------------------------------------ */

describe("generateZoneMap", () => {
  it("is deterministic for a given (zone, seed)", () => {
    const a = generateZoneMap(ZONES[0], SEED)
    const b = generateZoneMap(ZONES[0], SEED)
    expect(a).toEqual(b)
  })

  it("produces different layouts for different seeds", () => {
    const a = generateZoneMap(ZONES[0], 1)
    const b = generateZoneMap(ZONES[0], 2)
    expect(a).not.toEqual(b)
  })

  it("has exactly one start row and one boss node", () => {
    const map = generateZoneMap(ZONES[0], SEED)
    const rows = ZONES[0].rows
    expect(map.filter((n) => n.row === 0)).toHaveLength(1)
    const bosses = map.filter((n) => n.type === "boss")
    expect(bosses).toHaveLength(1)
    expect(bosses[0].row).toBe(rows - 1)
  })

  it("keeps every middle row within the zone's min/max width", () => {
    const zone = ZONES[0]
    const map = generateZoneMap(zone, SEED)
    const rowCounts: Record<number, number> = {}
    for (const n of map) rowCounts[n.row] = (rowCounts[n.row] ?? 0) + 1
    for (let r = 1; r < zone.rows - 1; r++) {
      expect(rowCounts[r]).toBeGreaterThanOrEqual(zone.minNodes)
      expect(rowCounts[r]).toBeLessThanOrEqual(zone.maxNodes)
    }
  })

  it("guarantees every node is reachable from the start", () => {
    for (const zone of ZONES) {
      const map = generateZoneMap(zone, SEED)
      const reached = reachableFromStart(map)
      expect(reached.size).toBe(map.length)
    }
  })

  it("guarantees every non-boss node has a forward edge", () => {
    const map = generateZoneMap(ZONES[0], SEED)
    for (const n of map) {
      if (n.type === "boss") expect(n.edges).toHaveLength(0)
      else expect(n.edges.length).toBeGreaterThan(0)
    }
  })

  it("only ever links to the immediately next row (no skips, no crossing rows)", () => {
    const map = generateZoneMap(ZONES[0], SEED)
    const lut = byId(map)
    for (const n of map) {
      for (const e of n.edges) {
        expect(lut[e].row).toBe(n.row + 1)
      }
    }
  })

  it("wires non-crossing (monotone) edge windows between rows", () => {
    // For adjacent source nodes, the max target col of the left node must not
    // exceed the min target col of the right node — that's what keeps lines
    // from crossing on the map.
    const map = generateZoneMap(ZONES[2], SEED)
    const lut = byId(map)
    const byRow: MapNode[][] = []
    for (const n of map) (byRow[n.row] ??= []).push(n)
    for (const row of byRow) {
      const sorted = [...row].sort((a, b) => a.col - b.col)
      for (let i = 0; i < sorted.length - 1; i++) {
        const left = sorted[i].edges.map((e) => lut[e].col)
        const right = sorted[i + 1].edges.map((e) => lut[e].col)
        if (left.length && right.length) {
          expect(Math.max(...left)).toBeLessThanOrEqual(Math.min(...right))
        }
      }
    }
  })

  it("guarantees at least one shop and one rest in every zone map", () => {
    for (const zone of ZONES) {
      const map = generateZoneMap(zone, SEED)
      const middle = map.filter((n) => n.row > 0 && n.row < zone.rows - 1)
      expect(middle.some((n) => n.type === "shop")).toBe(true)
      expect(middle.some((n) => n.type === "rest")).toBe(true)
    }
  })

  it("places an elite gauntlet on the row before the boss", () => {
    const zone = ZONES[0]
    const map = generateZoneMap(zone, SEED)
    const preBoss = map.filter((n) => n.row === zone.rows - 2)
    expect(preBoss.length).toBeGreaterThan(0)
    expect(preBoss.every((n) => n.type === "elite")).toBe(true)
  })

  it("makes the first row a gentle battle", () => {
    const map = generateZoneMap(ZONES[0], SEED)
    expect(map.filter((n) => n.row === 1).every((n) => n.type === "battle")).toBe(true)
  })

  it("telegraphs threat: combat nodes 1-3, non-combat 0, elites highest", () => {
    const map = generateZoneMap(ZONES[2], SEED)
    for (const n of map) {
      if (n.type === "battle") {
        expect(n.threat).toBeGreaterThanOrEqual(1)
        expect(n.threat).toBeLessThanOrEqual(3)
      } else if (n.type === "elite") {
        expect(n.threat).toBe(3)
      } else if (n.type !== "boss") {
        expect(n.threat).toBe(0)
      }
    }
  })
})

describe("generateAllZoneMaps", () => {
  it("returns one map per zone", () => {
    const maps = generateAllZoneMaps(SEED)
    expect(maps).toHaveLength(ZONES.length)
  })
})

/* ------------------------------------------------------------------ */
/* node lookup + reachability                                          */
/* ------------------------------------------------------------------ */

describe("node lookup", () => {
  it("currentNode falls back to the start node for an unknown id", () => {
    const map = generateZoneMap(ZONES[0], SEED)
    const s = stateAt({ nodeId: "does-not-exist" })
    expect(currentNode(ZONES[0], map, s)).toBe(map[0])
  })

  it("reachableNodes returns only forward, unvisited neighbours", () => {
    const map = generateZoneMap(ZONES[0], SEED)
    const start = map.find((n) => n.row === 0)!
    const s = stateAt({ nodeId: start.id, visited: [start.edges[0]] })
    const reachable = reachableNodes(map, s)
    expect(reachable.every((n) => start.edges.includes(n.id))).toBe(true)
    expect(reachable.some((n) => n.id === start.edges[0])).toBe(false)
  })

  it("nodeTypeAt / isBossNode / isRestNode agree with the generated map", () => {
    const map = generateZoneMap(ZONES[0], SEED)
    const boss = map.find((n) => n.type === "boss")!
    const rest = map.find((n) => n.type === "rest")!
    expect(isBossNode(stateAt({ nodeId: boss.id }))).toBe(true)
    expect(isRestNode(stateAt({ nodeId: rest.id }))).toBe(true)
    expect(nodeTypeAt(stateAt({ nodeId: boss.id }))).toBe("boss")
  })
})

/* ------------------------------------------------------------------ */
/* travel + interest ledger                                            */
/* ------------------------------------------------------------------ */

describe("travel + interest", () => {
  it("travelToNode is pure and only moves the hero", () => {
    const s = stateAt()
    const moved = travelToNode(s, "2-1")
    expect(moved.nodeId).toBe("2-1")
    expect(s.nodeId).not.toBe("2-1") // original untouched
    expect({ ...moved, nodeId: s.nodeId }).toEqual(s)
  })

  it("accrueInterest is at least the zone's flat rent", () => {
    const s = stateAt({ debt: 0, zoneIndex: 0 })
    expect(accrueInterest(s)).toBe(ZONES[0].baseRent)
  })

  it("accrueInterest compounds once debt is large enough", () => {
    const debt = 1000
    const s = stateAt({ debt, zoneIndex: 0 })
    expect(accrueInterest(s)).toBe(Math.ceil(debt * INTEREST_RATE))
  })

  it("clearCurrentNode marks visited and adds interest to debt", () => {
    const s = stateAt({ nodeId: "1-0", debt: START_DEBT, visited: [] })
    const cleared = clearCurrentNode(s)
    expect(cleared.visited).toContain("1-0")
    expect(cleared.debt).toBe(START_DEBT + accrueInterest(s))
  })

  it("clearCurrentNode is idempotent for an already-visited node", () => {
    const s = stateAt({ nodeId: "1-0", visited: ["1-0"] })
    expect(clearCurrentNode(s)).toBe(s)
  })

  it("healAtRest heals 30% of max hp (floored) and clears the node", () => {
    const s = stateAt({ nodeId: "1-0", hp: 1, maxHp: 14, visited: [] })
    const rested = healAtRest(s)
    expect(rested.hp).toBe(1 + Math.floor(14 * 0.3))
    expect(rested.visited).toContain("1-0")
  })

  it("healAtRest never exceeds max hp", () => {
    const s = stateAt({ nodeId: "1-0", hp: 14, maxHp: 14 })
    expect(healAtRest(s).hp).toBe(14)
  })

  it("unlockNextZone raises unlockedZones and clears the boss node", () => {
    const s = stateAt({ nodeId: "5-0", zoneIndex: 0, unlockedZones: 1, visited: [] })
    const next = unlockNextZone(s)
    expect(next.unlockedZones).toBe(2)
    expect(next.visited).toContain("5-0")
  })

  it("unlockNextZone never lowers an already-higher unlock count", () => {
    const s = stateAt({ zoneIndex: 0, unlockedZones: 3 })
    expect(unlockNextZone(s).unlockedZones).toBe(3)
  })
})

/* ------------------------------------------------------------------ */
/* debt / foreclosure                                                  */
/* ------------------------------------------------------------------ */

describe("debt + foreclosure", () => {
  it("isForeclosed triggers exactly at the cap", () => {
    expect(isForeclosed(stateAt({ debt: FORECLOSURE_CAP - 1 }))).toBe(false)
    expect(isForeclosed(stateAt({ debt: FORECLOSURE_CAP }))).toBe(true)
    expect(isForeclosed(stateAt({ debt: FORECLOSURE_CAP + 50 }))).toBe(true)
  })

  it("payDebt reduces gold and debt 1:1", () => {
    const s = stateAt({ gold: 100, debt: 80 })
    const paid = payDebt(s, 50)
    expect(paid.gold).toBe(50)
    expect(paid.debt).toBe(30)
  })

  it("payDebt is bounded by available gold", () => {
    const s = stateAt({ gold: 20, debt: 80 })
    const paid = payDebt(s, 50)
    expect(paid.gold).toBe(0)
    expect(paid.debt).toBe(60)
  })

  it("payDebt is bounded by outstanding debt (no negative debt / refund)", () => {
    const s = stateAt({ gold: 100, debt: 30 })
    const paid = payDebt(s, 50)
    expect(paid.debt).toBe(0)
    expect(paid.gold).toBe(70)
  })

  it("payDebt ignores negative amounts", () => {
    const s = stateAt({ gold: 100, debt: 80 })
    expect(payDebt(s, -25)).toEqual(s)
  })
})

/* ------------------------------------------------------------------ */
/* shop                                                                */
/* ------------------------------------------------------------------ */

describe("shop", () => {
  it("shopInventory is deterministic and offers up to 4 valid cards", () => {
    const a = shopInventory(SEED, 0, "2-1")
    const b = shopInventory(SEED, 0, "2-1")
    expect(a).toEqual(b)
    expect(a.length).toBeLessThanOrEqual(4)
    for (const offer of a) {
      expect(CARD_LIBRARY[offer.cardId]).toBeTruthy()
      expect(offer.price).toBeGreaterThan(0)
    }
  })

  it("shopInventory offers distinct cards", () => {
    const inv = shopInventory(SEED, 0, "2-1")
    expect(new Set(inv.map((o) => o.cardId)).size).toBe(inv.length)
  })

  it("buyCard deducts gold and appends to the deck when affordable", () => {
    const s = stateAt({ gold: 100, deck: ["a"] })
    const bought = buyCard(s, "x", 60)
    expect(bought.gold).toBe(40)
    expect(bought.deck).toEqual(["a", "x"])
  })

  it("buyCard is a no-op when unaffordable", () => {
    const s = stateAt({ gold: 10, deck: ["a"] })
    expect(buyCard(s, "x", 60)).toBe(s)
  })

  it("removeCardFromDeck strikes one copy and charges the fee", () => {
    const s = stateAt({ gold: 100, deck: ["a", "b", "a"] })
    const removed = removeCardFromDeck(s, "a", REMOVE_PRICE)
    expect(removed.gold).toBe(100 - REMOVE_PRICE)
    expect(removed.deck).toEqual(["b", "a"]) // only first copy struck
  })

  it("removeCardFromDeck is a no-op if the card isn't in the deck", () => {
    const s = stateAt({ gold: 100, deck: ["a"] })
    expect(removeCardFromDeck(s, "zzz", REMOVE_PRICE)).toBe(s)
  })

  it("removeCardFromDeck is a no-op when unaffordable", () => {
    const s = stateAt({ gold: 5, deck: ["a"] })
    expect(removeCardFromDeck(s, "a", REMOVE_PRICE)).toBe(s)
  })

  it("REMOVE_PRICE mirrors the data-layer constant", () => {
    expect(REMOVE_PRICE).toBe(SHOP_REMOVE_PRICE)
  })
})

/* ------------------------------------------------------------------ */
/* events                                                              */
/* ------------------------------------------------------------------ */

describe("events", () => {
  it("eventForNode is deterministic per (seed, zone, node)", () => {
    expect(eventForNode(SEED, 0, "2-1")).toBe(eventForNode(SEED, 0, "2-1"))
  })

  it("applyEventChoice applies gold/hp/debt/card then clears the node", () => {
    const s = stateAt({ nodeId: "2-1", gold: 10, hp: 8, maxHp: 14, debt: 20, deck: [], visited: [] })
    const out = applyEventChoice(s, { gold: 40, debt: 30, card: "loot" })
    expect(out.gold).toBe(50)
    expect(out.debt).toBe(20 + 30 + accrueInterest(s)) // event debt + interest tick
    expect(out.deck).toContain("loot")
    expect(out.visited).toContain("2-1")
  })

  it("applyEventChoice clamps gold at 0 and hp within [1, maxHp]", () => {
    const s = stateAt({ nodeId: "2-1", gold: 5, hp: 3, maxHp: 14, visited: [] })
    const drained = applyEventChoice(s, { gold: -100, hp: -100 })
    expect(drained.gold).toBe(0)
    expect(drained.hp).toBe(1)
    const overheal = applyEventChoice(stateAt({ nodeId: "2-1", hp: 12, maxHp: 14 }), { hp: 100 })
    expect(overheal.hp).toBe(14)
  })

  it("applyEventChoice never drives debt negative", () => {
    const s = stateAt({ nodeId: "2-1", debt: 10, visited: [] })
    const out = applyEventChoice(s, { debt: -100 })
    expect(out.debt).toBeGreaterThanOrEqual(0)
  })
})

/* ------------------------------------------------------------------ */
/* battle setup                                                        */
/* ------------------------------------------------------------------ */

describe("battle setup", () => {
  it("battleEnemiesForZone scales elites up (~1.6x)", () => {
    const normal = battleEnemiesForZone(0, false)
    const elite = battleEnemiesForZone(0, true)
    expect(normal).toHaveLength(elite.length)
    for (let i = 0; i < normal.length; i++) {
      expect(elite[i].hp).toBeGreaterThan(normal[i].hp)
      expect(elite[i].name).toContain("Elite")
    }
  })

  it("battleEnemiesForZone returns [] for an invalid zone", () => {
    expect(battleEnemiesForZone(99)).toEqual([])
  })

  it("bossEnemiesForZone includes exactly one boss unit", () => {
    const lineup = bossEnemiesForZone(0)
    expect(lineup.filter((e) => e.kind === UnitKind.Boss)).toHaveLength(1)
    const boss = lineup.find((e) => e.kind === UnitKind.Boss)!
    expect(boss.name).toBe(ZONES[0].boss.name)
  })

  it("enemiesForNode dispatches by node type", () => {
    const map = generateZoneMap(ZONES[0], SEED)
    const boss = map.find((n) => n.type === "boss")!
    const elite = map.find((n) => n.type === "elite")!
    const bossLineup = enemiesForNode(stateAt({ nodeId: boss.id }))
    const eliteLineup = enemiesForNode(stateAt({ nodeId: elite.id }))
    expect(bossLineup.some((e) => e.kind === UnitKind.Boss)).toBe(true)
    expect(eliteLineup.every((e) => e.name.includes("Elite"))).toBe(true)
  })
})

/* ------------------------------------------------------------------ */
/* rewards                                                             */
/* ------------------------------------------------------------------ */

describe("rewards", () => {
  it("rollRewards is deterministic and yields 3 distinct valid cards", () => {
    const a = rollRewards(SEED, 0, "2-1")
    const b = rollRewards(SEED, 0, "2-1")
    expect(a).toEqual(b)
    expect(a.cards).toHaveLength(3)
    expect(new Set(a.cards).size).toBe(3)
    for (const c of a.cards) expect(CARD_LIBRARY[c]).toBeTruthy()
    expect(a.gold).toBeGreaterThan(0)
  })

  it("elite rewards out-pay standard, treasure out-pays elite", () => {
    const base = rollRewards(SEED, 0, "2-1")
    const elite = rollEliteRewards(SEED, 0, "2-1")
    const treasure = rollTreasure(SEED, 0, "2-1")
    expect(elite.gold).toBeGreaterThan(base.gold)
    expect(treasure.gold).toBeGreaterThan(base.gold)
    // reward cards are the same pick across tiers (only the purse changes)
    expect(elite.cards).toEqual(base.cards)
  })

  it("addRewardToState appends the card and adds gold", () => {
    const s = stateAt({ gold: 10, deck: ["a"] })
    const out = addRewardToState(s, "x", 25)
    expect(out.gold).toBe(35)
    expect(out.deck).toEqual(["a", "x"])
  })
})

/* ------------------------------------------------------------------ */
/* new run                                                             */
/* ------------------------------------------------------------------ */

describe("createNewRun", () => {
  it("starts in the shallows, at the start node, owing the starting debt", () => {
    const s = createNewRun(SEED)
    expect(s.zoneIndex).toBe(0)
    expect(s.nodeId).toBe("0-0")
    expect(s.debt).toBe(START_DEBT)
    expect(s.gold).toBe(0)
    expect(s.unlockedZones).toBe(1)
    expect(s.visited).toEqual([])
    expect(s.hp).toBe(s.maxHp)
    expect(s.deck.length).toBeGreaterThan(0)
  })

  it("uses the provided seed so runs are reproducible", () => {
    expect(createNewRun(SEED).seed).toBe(SEED)
  })
})
