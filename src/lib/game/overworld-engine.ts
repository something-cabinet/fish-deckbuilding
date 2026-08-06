import { CARD_LIBRARY, STARTER_DECK } from "@/lib/game/cards"
import { ENEMY_LIBRARY, HERO_DEF, UnitKind, type EnemyDef, type EnemySpawn } from "@/lib/game/units"
import { STAGE_LIBRARY, pickStage, stageToSpawns, type StageDef } from "@/lib/game/stages"
import type { Pos } from "@/lib/game/battle/models"
import {
  EVENTS,
  FORECLOSURE_CAP,
  INTEREST_RATE,
  NODE_KIND_WEIGHTS,
  SHOP_REMOVE_PRICE,
  START_DEBT,
  ZONES,
  shopCardPrice,
  type EventDef,
} from "./overworld-data"
import type { MapNode, NodeType, OverworldState, ZoneDef } from "./overworld-types"

/* ------------------------------------------------------------------ */
/* seeded rng (mulberry32)                                             */
/* ------------------------------------------------------------------ */

/** Deterministic PRNG so a run seed yields a stable map and rewards. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function pick<T>(rng: () => number, arr: T[]): T {
  return arr[Math.floor(rng() * arr.length)]
}

function intBetween(rng: () => number, min: number, max: number): number {
  return min + Math.floor(rng() * (max - min + 1))
}

/** Fisher-Yates shuffle using the seeded rng, returns the same array. */
function shuffle<T>(rng: () => number, arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

function hashStr(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h & 0xffffffff
}

/* ------------------------------------------------------------------ */
/* map generation                                                      */
/* ------------------------------------------------------------------ */

/** Weighted bag of filler node kinds for the generic middle rows. */
function fillerBag(): NodeType[] {
  const bag: NodeType[] = []
  for (const [k, w] of Object.entries(NODE_KIND_WEIGHTS)) {
    for (let i = 0; i < (w ?? 0); i++) bag.push(k as NodeType)
  }
  return bag
}

/** Telegraphed threat tier for a node (0 = no combat). */
function threatFor(type: NodeType, zoneIndex: number, nodeId: string): number {
  if (type === "elite") return 3
  if (type === "battle") {
    const base = 1 + (hashStr(nodeId) % 2) // 1..2
    return Math.min(3, base + (zoneIndex >= 2 ? 1 : 0))
  }
  return 0
}

/**
 * Assign a node kind to every middle-row node with structural guarantees:
 * row 1 is always a gentle battle, the row before the boss is an elite
 * gauntlet, and every zone map is guaranteed at least one shop and one rest
 * so the economy and healing loops always exist.
 */
function assignTypes(byRow: MapNode[][], rows: number, rng: () => number): void {
  const bag = fillerBag()
  for (let r = 1; r < rows - 1; r++) {
    for (const n of byRow[r]) {
      if (r === 1) n.type = "battle"
      else if (r === rows - 2) n.type = "elite"
      else n.type = pick(rng, bag)
    }
  }

  const middle = byRow.slice(1, rows - 1).flat()
  const ensure = (kind: NodeType) => {
    if (middle.some((n) => n.type === kind)) return
    // convert a random non-elite, non-forced middle node
    const candidates = middle.filter((n) => n.type === "battle" || n.type === "event")
    if (candidates.length) pick(rng, candidates).type = kind
  }
  ensure("shop")
  ensure("rest")
}

/**
 * Generate a full zone map deterministically from (zoneDef, seed).
 * Rows vary 2-4 wide so paths genuinely diverge and reconverge (committing
 * to a branch means giving another up). Edges are ordered, non-overlapping
 * windows so connecting lines never cross while every node stays reachable
 * from the start and keeps a way forward.
 */
export function generateZoneMap(zone: ZoneDef, seed: number): MapNode[] {
  const rng = mulberry32(seed * 7919 + zone.index * 104729)

  const rows = zone.rows
  const colCounts: number[] = [1]
  for (let r = 1; r < rows - 1; r++) {
    colCounts.push(intBetween(rng, zone.minNodes, zone.maxNodes))
  }
  colCounts.push(1)

  const nodes: MapNode[] = []
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < colCounts[r]; c++) {
      nodes.push({
        id: `${r}-${c}`,
        row: r,
        col: c,
        type: r === 0 ? "battle" : r === rows - 1 ? "boss" : "battle",
        threat: 0,
        edges: [],
        x: ((c + 0.5) / colCounts[r]) * 100,
        y: ((r + 0.5) / rows) * 100,
      })
    }
  }

  const byRow: MapNode[][] = []
  for (const n of nodes) (byRow[n.row] ??= []).push(n)

  // assign node kinds (structural guarantees) then telegraph threat
  assignTypes(byRow, rows, rng)
  for (const n of nodes) n.threat = threatFor(n.type, zone.index, n.id)

  // wire edges with a monotone (non-crossing) window assignment
  for (let r = 0; r < rows - 1; r++) {
    const cur = byRow[r]
    const next = byRow[r + 1]
    const m = next.length
    if (m === 0) continue

    const gaps = new Array<number>(cur.length).fill(0)
    let remaining = m - 1
    const order = shuffle(rng, [...Array(cur.length).keys()])
    for (const i of order) {
      if (remaining === 0) break
      gaps[i]++
      remaining--
    }
    while (remaining > 0) {
      gaps[Math.floor(rng() * cur.length)]++
      remaining--
    }

    let lo = 0
    for (let i = 0; i < cur.length; i++) {
      const hi = lo + gaps[i]
      cur[i].edges = next.slice(lo, hi + 1).map((n) => n.id)
      lo = hi
    }
  }

  return nodes
}

/** Generate maps for all zones from a single run seed. */
export function generateAllZoneMaps(seed: number): MapNode[][] {
  return ZONES.map((z) => generateZoneMap(z, seed))
}

/* ------------------------------------------------------------------ */
/* node lookup helpers                                                 */
/* ------------------------------------------------------------------ */

/** The node the hero currently stands on. */
export function currentNode(zone: ZoneDef, map: MapNode[], state: OverworldState): MapNode {
  return map.find((n) => n.id === state.nodeId) ?? map[0]
}

/** Nodes connected to the hero's current node, not yet cleared. */
export function reachableNodes(map: MapNode[], state: OverworldState): MapNode[] {
  const cur = currentNode(ZONES[state.zoneIndex], map, state)
  return cur.edges
    .map((id) => map.find((n) => n.id === id))
    .filter((n): n is MapNode => !!n && !state.visited.includes(n.id))
}

/** The node kind the hero currently stands on (regenerated from seed). */
export function nodeTypeAt(state: OverworldState): NodeType {
  const zone = ZONES[state.zoneIndex]
  if (!zone) return "battle"
  const map = generateZoneMap(zone, state.seed)
  return map.find((n) => n.id === state.nodeId)?.type ?? "battle"
}

/** Whether the hero's current node is a boss node. */
export function isBossNode(state: OverworldState): boolean {
  return nodeTypeAt(state) === "boss"
}

/** Whether the current node resolves to a Rest. */
export function isRestNode(state: OverworldState): boolean {
  return nodeTypeAt(state) === "rest"
}

/* ------------------------------------------------------------------ */
/* travel + node clearing (with interest accrual)                      */
/* ------------------------------------------------------------------ */

/**
 * Advance the hero to a node. Pure — returns a new state. The transition is
 * treated as entering the node; the node's action is resolved by the caller.
 */
export function travelToNode(state: OverworldState, nodeId: string): OverworldState {
  return { ...state, nodeId }
}

/** Interest that would be charged for clearing one more node right now. */
export function accrueInterest(state: OverworldState): number {
  const zone = ZONES[state.zoneIndex]
  const rent = zone?.baseRent ?? 8
  return Math.max(rent, Math.ceil(state.debt * INTEREST_RATE))
}

/**
 * Mark the current node cleared and tick the debt ledger. Every cleared node
 * is "a day passing", so interest compounds here — the pressure that makes
 * gold worth spending on the ledger.
 */
export function clearCurrentNode(state: OverworldState): OverworldState {
  if (state.visited.includes(state.nodeId)) return state
  const interest = accrueInterest(state)
  return {
    ...state,
    visited: [...state.visited, state.nodeId],
    debt: state.debt + interest,
  }
}

/** Rest node: heal 30% of max HP, round down (spec: 30% of 14 -> 4). */
export function healAtRest(state: OverworldState): OverworldState {
  const healed = Math.floor(state.maxHp * 0.3)
  return clearCurrentNode({ ...state, hp: Math.min(state.maxHp, state.hp + healed) })
}

/** Boss won: unlock the next zone and mark this zone's boss cleared. */
export function unlockNextZone(state: OverworldState): OverworldState {
  return clearCurrentNode({
    ...state,
    unlockedZones: Math.max(state.unlockedZones, state.zoneIndex + 2),
  })
}

/* ------------------------------------------------------------------ */
/* debt ledger + foreclosure                                           */
/* ------------------------------------------------------------------ */

/** Has the syndicate foreclosed? (run-ending) */
export function isForeclosed(state: OverworldState): boolean {
  return state.debt >= FORECLOSURE_CAP
}

/** Pay gold against the debt, 1:1, bounded by gold and outstanding debt. */
export function payDebt(state: OverworldState, amount: number): OverworldState {
  const pay = Math.max(0, Math.min(amount, state.gold, state.debt))
  return { ...state, gold: state.gold - pay, debt: state.debt - pay }
}

/* ------------------------------------------------------------------ */
/* shop                                                                */
/* ------------------------------------------------------------------ */

export interface ShopOffer {
  cardId: string
  price: number
}

/** Seeded card inventory for a shop node (4 distinct offers). */
export function shopInventory(seed: number, zoneIndex: number, nodeId: string): ShopOffer[] {
  const rng = mulberry32(seed * 53 + zoneIndex * 197 + hashStr(nodeId))
  const pool = shuffle(rng, Object.keys(CARD_LIBRARY))
  return pool.slice(0, Math.min(4, pool.length)).map((cardId) => ({
    cardId,
    price: shopCardPrice(CARD_LIBRARY[cardId]?.cost ?? 1),
  }))
}

export const REMOVE_PRICE = SHOP_REMOVE_PRICE

/** Buy a card at a shop: deduct gold, add to deck. No-op if unaffordable. */
export function buyCard(state: OverworldState, cardId: string, price: number): OverworldState {
  if (state.gold < price) return state
  return { ...state, gold: state.gold - price, deck: [...state.deck, cardId] }
}

/** Strike one copy of a card from the deck for a flat fee. */
export function removeCardFromDeck(
  state: OverworldState,
  cardId: string,
  price: number,
): OverworldState {
  if (state.gold < price) return state
  const i = state.deck.indexOf(cardId)
  if (i < 0) return state
  const deck = [...state.deck]
  deck.splice(i, 1)
  return { ...state, gold: state.gold - price, deck }
}

/* ------------------------------------------------------------------ */
/* events                                                              */
/* ------------------------------------------------------------------ */

/** Seeded `?` encounter for a node. */
export function eventForNode(seed: number, zoneIndex: number, nodeId: string): EventDef {
  const rng = mulberry32(seed * 89 + zoneIndex * 211 + hashStr(nodeId))
  return pick(rng, EVENTS)
}

/** Apply an event choice's outcome, then clear the node (ticks interest). */
export function applyEventChoice(
  state: OverworldState,
  choice: { gold?: number; hp?: number; debt?: number; card?: string },
): OverworldState {
  let s = { ...state }
  if (choice.gold) s.gold = Math.max(0, s.gold + choice.gold)
  if (choice.hp) s.hp = Math.max(1, Math.min(s.maxHp, s.hp + choice.hp))
  if (choice.debt) s.debt = Math.max(0, s.debt + choice.debt)
  if (choice.card) s.deck = [...s.deck, choice.card]
  return clearCurrentNode(s)
}

export const HERO_MAX_HP = HERO_DEF.maxHp

/* ------------------------------------------------------------------ */
/* battle setup                                                        */
/* ------------------------------------------------------------------ */

/** Fixed slots where enemies spawn on the 9x5 grid (mirrors ENEMY_SPAWNS). */
const BATTLE_SLOTS: { x: number; y: number }[] = [
  { x: 6, y: 1 },
  { x: 6, y: 3 },
  { x: 7, y: 0 },
  { x: 7, y: 4 },
  { x: 8, y: 2 },
]

/** Build the enemy lineup for a standard battle in a zone. */
export function battleEnemiesForZone(zoneIndex: number, elite = false): EnemySpawn[] {
  const zone = ZONES[zoneIndex]
  if (!zone) return []
  const pool = zone.enemyPool
  if (pool.length === 0) return []
  const scale = elite ? 1.6 : 1
  return BATTLE_SLOTS.map((slot, i) => {
    const t = pool[i % pool.length]
    return {
      name: elite ? `Elite ${t.name}` : t.name,
      kind: t.kind,
      x: slot.x,
      y: slot.y,
      hp: Math.round(t.hp * scale),
      atk: Math.round(t.atk * scale),
      move: t.move,
    }
  })
}

/** Build the boss lineup: unique boss + two guard adds. */
export function bossEnemiesForZone(zoneIndex: number): EnemySpawn[] {
  const zone = ZONES[zoneIndex]
  if (!zone) return []
  const b = zone.boss
  const pool = zone.enemyPool
  const guards =
    pool.length > 0
      ? pool.slice(0, 2).map((t, i) => ({
          name: t.name,
          kind: t.kind,
          x: i === 0 ? 6 : 7,
          y: i === 0 ? 1 : 3,
          hp: t.hp,
          atk: t.atk,
          move: t.move,
        }))
      : []
  return [
    ...guards,
    { name: b.name, kind: UnitKind.Boss, x: 8, y: 2, hp: b.hp, atk: b.atk, move: b.move },
  ]
}

/** The current node's enemy lineup (boss / elite / standard). */
export function enemiesForNode(state: OverworldState): EnemySpawn[] {
  const zone = ZONES[state.zoneIndex]
  if (!zone) return []
  const type = nodeTypeAt(state)
  if (type === "boss") return bossEnemiesForZone(state.zoneIndex)
  if (type === "elite") return battleEnemiesForZone(state.zoneIndex, true)
  return battleEnemiesForZone(state.zoneIndex, false)
}

/**
 * The authored stage this node fights on, or null when the zone has no stage
 * of the required kind. Seeded from the run seed plus the node ref, so
 * re-entering a node fights the same stage instead of rerolling.
 */
export function stageForNode(
  state: OverworldState,
  stages: StageDef[] = STAGE_LIBRARY,
): StageDef | null {
  const zone = ZONES[state.zoneIndex]
  if (!zone) return null
  const seed = state.seed + state.zoneIndex * 101 + hashStr(state.nodeId)
  return pickStage(stages, zone.id, nodeTypeAt(state) === "boss", seed)
}

/** Everything a battle needs from the overworld: lineup plus board geometry. */
export interface BattleSetup {
  enemies: EnemySpawn[]
  cols?: number
  rows?: number
  heroStart?: Pos
}

/**
 * Build a node's battle from its stage. Falls back to the zone's built-in
 * lineup when no stage matches, so a run never stalls on an empty pool.
 */
export function battleSetupForNode(
  state: OverworldState,
  stages: StageDef[] = STAGE_LIBRARY,
  enemyDefs: EnemyDef[] = ENEMY_LIBRARY,
): BattleSetup {
  const stage = stageForNode(state, stages)
  if (!stage) return { enemies: enemiesForNode(state) }

  return {
    enemies: stageToSpawns(stage, enemyDefs, { elite: nodeTypeAt(state) === "elite" }),
    cols: stage.cols,
    rows: stage.rows,
    heroStart: stage.heroStart,
  }
}

export function zoneName(index: number): string {
  return ZONES[index]?.name ?? `Zone ${index + 1}`
}

/* ------------------------------------------------------------------ */
/* rewards                                                             */
/* ------------------------------------------------------------------ */

export interface RolledRewards {
  cards: string[]
  gold: number
}

/** Roll 3 distinct reward cards + a gold amount from the run seed + node. */
export function rollRewards(seed: number, zoneIndex: number, nodeId: string): RolledRewards {
  const rng = mulberry32(seed * 31 + zoneIndex * 131 + (nodeId ? hashStr(nodeId) : 0))
  const pool = Object.keys(CARD_LIBRARY)
  const cards: string[] = []
  while (cards.length < 3 && cards.length < pool.length) {
    const c = pool[Math.floor(rng() * pool.length)]
    if (!cards.includes(c)) cards.push(c)
  }
  return { cards, gold: 5 + Math.floor(rng() * 6) + zoneIndex * 3 }
}

/** Elite rewards: same card pick, richer gold purse. */
export function rollEliteRewards(seed: number, zoneIndex: number, nodeId: string): RolledRewards {
  const base = rollRewards(seed, zoneIndex, nodeId)
  return { cards: base.cards, gold: base.gold + 15 + zoneIndex * 5 }
}

/** Treasure rewards: no fight, generous gold + a card pick. */
export function rollTreasure(seed: number, zoneIndex: number, nodeId: string): RolledRewards {
  const base = rollRewards(seed, zoneIndex, nodeId)
  return { cards: base.cards, gold: base.gold * 2 + 20 }
}

export function addRewardToState(
  state: OverworldState,
  cardId: string,
  gold: number,
): OverworldState {
  return { ...state, deck: [...state.deck, cardId], gold: state.gold + gold }
}

/* ------------------------------------------------------------------ */
/* new run + save / load                                               */
/* ------------------------------------------------------------------ */

// bumped to v2: node-type + debt model changed, old saves are incompatible.
export const SAVE_KEY = "fish-mafia-save-v2"

export function createNewRun(seed?: number): OverworldState {
  const s = seed ?? Math.floor(Math.random() * 0xffffffff)
  return {
    zoneIndex: 0,
    nodeId: "0-0",
    hp: HERO_MAX_HP,
    maxHp: HERO_MAX_HP,
    gold: 0,
    fin: 0,
    debt: START_DEBT,
    deck: [...STARTER_DECK],
    visited: [],
    unlockedZones: 1,
    seed: s,
  }
}

export function loadSave(): OverworldState | null {
  if (typeof window === "undefined") return null
  try {
    const raw = window.localStorage.getItem(SAVE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as OverworldState
    if (!isValidSave(parsed)) return null
    // backfill fields added after this save version was written
    return { ...parsed, fin: typeof parsed.fin === "number" ? parsed.fin : 0 }
  } catch {
    return null
  }
}

export function saveState(state: OverworldState): void {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(SAVE_KEY, JSON.stringify(state))
  } catch {
    /* storage full / unavailable — non fatal for a dev game */
  }
}

export function clearSave(): void {
  if (typeof window === "undefined") return
  try {
    window.localStorage.removeItem(SAVE_KEY)
  } catch {
    /* ignore */
  }
}

function isValidSave(s: OverworldState): boolean {
  return (
    typeof s.zoneIndex === "number" &&
    typeof s.nodeId === "string" &&
    typeof s.hp === "number" &&
    typeof s.maxHp === "number" &&
    typeof s.gold === "number" &&
    typeof s.debt === "number" &&
    Array.isArray(s.deck) &&
    Array.isArray(s.visited) &&
    typeof s.unlockedZones === "number" &&
    typeof s.seed === "number"
  )
}
