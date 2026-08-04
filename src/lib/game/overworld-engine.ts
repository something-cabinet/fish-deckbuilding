import { CARD_LIBRARY, STARTER_DECK } from "@/lib/game/cards"
import { HERO_DEF, type EnemySpawn } from "@/lib/game/units"
import { NODE_KIND_WEIGHTS, ZONES } from "./overworld-data"
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

/* ------------------------------------------------------------------ */
/* map generation                                                      */
/* ------------------------------------------------------------------ */

function nodeTypeFor(rng: () => number, row: number, rows: number): NodeType {
  if (row === 0) return "battle"
  if (row === rows - 1) return "boss"
  const bag: NodeType[] = []
  for (const [k, w] of Object.entries(NODE_KIND_WEIGHTS)) {
    for (let i = 0; i < w; i++) bag.push(k as NodeType)
  }
  return pick(rng, bag)
}

/**
 * Generate a full zone map deterministically from (zoneDef, seed).
 * Layout: 5-7 rows; row 0 = start (battle), middle rows 2-3 nodes with
 * battle/rest mix, last row = boss. Edges are assigned as ordered,
 * non-overlapping windows so connecting lines never cross, while every
 * node stays reachable from the start and has at least one way forward.
 */
export function generateZoneMap(zone: ZoneDef, seed: number): MapNode[] {
  const rng = mulberry32(seed * 7919 + zone.index * 104729)

  // per-row node counts; rows is zone.rows (5-7)
  const rows = zone.rows
  const colCounts: number[] = [1]
  for (let r = 1; r < rows - 1; r++) {
    colCounts.push(intBetween(rng, zone.minNodes, zone.maxNodes))
  }
  colCounts.push(1)

  const nodes: MapNode[] = []
  // 1) create every node with a type and layout position
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < colCounts[r]; c++) {
      nodes.push({
        id: `${r}-${c}`,
        row: r,
        col: c,
        type: nodeTypeFor(rng, r, rows),
        edges: [],
        x: ((c + 0.5) / colCounts[r]) * 100,
        y: ((r + 0.5) / rows) * 100,
      })
    }
  }

  const byRow: MapNode[][] = []
  for (const n of nodes) (byRow[n.row] ??= []).push(n)

  // 2) wire edges with a monotone assignment so paths never cross.
  // Each node owns a contiguous window of next-row nodes and windows are
  // ordered left-to-right, which makes every connecting line stay to the
  // left of the next node's lines. Every next-row node is covered (so the
  // map stays fully connected) and every node keeps at least one way out.
  for (let r = 0; r < rows - 1; r++) {
    const cur = byRow[r]
    const next = byRow[r + 1]
    const m = next.length
    if (m === 0) continue

    // distribute (m - 1) "gap" units across cur nodes; node i gets a window
    // of gaps[i] + 1 next-row nodes. Prefer 1-2 targets (branching) and only
    // fan out wider when few nodes must cover many (e.g. the start row).
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

    // walk the windows left-to-right and assign edge ids
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
/* state helpers                                                       */
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

/**
 * Advance the hero to a node. Pure — returns a new state. The transition is
 * treated as entering the node; the node's action is resolved by the caller.
 */
export function travelToNode(state: OverworldState, nodeId: string): OverworldState {
  return { ...state, nodeId }
}

/** Mark the current node cleared (battle won / rest used / boss beaten). */
export function clearCurrentNode(state: OverworldState): OverworldState {
  if (state.visited.includes(state.nodeId)) return state
  return { ...state, visited: [...state.visited, state.nodeId] }
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
export function battleEnemiesForZone(zoneIndex: number): EnemySpawn[] {
  const zone = ZONES[zoneIndex]
  if (!zone) return []
  const pool = zone.enemyPool
  if (pool.length === 0) return []
  return BATTLE_SLOTS.map((slot, i) => {
    const t = pool[i % pool.length]
    return {
      name: t.name,
      kind: t.kind,
      x: slot.x,
      y: slot.y,
      hp: t.hp,
      atk: t.atk,
      move: t.move,
    } as EnemySpawn
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
          kind: t.kind as EnemySpawn["kind"],
          x: i === 0 ? 6 : 7,
          y: i === 0 ? 1 : 3,
          hp: t.hp,
          atk: t.atk,
          move: t.move,
        }))
      : []
  return [
    ...guards,
    { name: b.name, kind: "boss", x: 8, y: 2, hp: b.hp, atk: b.atk, move: b.move },
  ]
}

/** The current zone's battle (or boss) enemy lineup. */
export function enemiesForNode(state: OverworldState): EnemySpawn[] {
  const zone = ZONES[state.zoneIndex]
  if (!zone) return []
  const node = `${state.nodeId}`
  const isBossRow = node.startsWith(`${zone.rows - 1}-`)
  return isBossRow ? bossEnemiesForZone(state.zoneIndex) : battleEnemiesForZone(state.zoneIndex)
}

/** Whether the hero's current node is a boss node. */
export function isBossNode(state: OverworldState): boolean {
  const zone = ZONES[state.zoneIndex]
  if (!zone) return false
  return state.nodeId.startsWith(`${zone.rows - 1}-`)
}

/** Whether the current node resolves to a Rest. */
export function isRestNode(state: OverworldState): boolean {
  const zone = ZONES[state.zoneIndex]
  if (!zone) return false
  const map = generateZoneMap(zone, state.seed)
  const node = map.find((n) => n.id === state.nodeId)
  return node?.type === "rest"
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
export function rollRewards(
  seed: number,
  zoneIndex: number,
  nodeId: string,
): RolledRewards {
  const rng = mulberry32(seed * 31 + zoneIndex * 131 + (nodeId ? hashStr(nodeId) : 0))
  const pool = Object.keys(CARD_LIBRARY)
  const cards: string[] = []
  while (cards.length < 3 && cards.length < pool.length) {
    const c = pool[Math.floor(rng() * pool.length)]
    if (!cards.includes(c)) cards.push(c)
  }
  return { cards, gold: 5 + Math.floor(rng() * 6) + zoneIndex * 3 }
}

function hashStr(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h & 0xffffffff
}

export function addRewardToState(state: OverworldState, cardId: string, gold: number): OverworldState {
  return { ...state, deck: [...state.deck, cardId], gold: state.gold + gold }
}

/* ------------------------------------------------------------------ */
/* new run + save / load                                               */
/* ------------------------------------------------------------------ */

export const SAVE_KEY = "fish-mafia-save"

export function createNewRun(seed?: number): OverworldState {
  const s = seed ?? Math.floor(Math.random() * 0xffffffff)
  return {
    zoneIndex: 0,
    nodeId: "0-0",
    hp: HERO_MAX_HP,
    maxHp: HERO_MAX_HP,
    gold: 0,
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
    return parsed
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
    Array.isArray(s.deck) &&
    Array.isArray(s.visited) &&
    typeof s.unlockedZones === "number" &&
    typeof s.seed === "number"
  )
}
