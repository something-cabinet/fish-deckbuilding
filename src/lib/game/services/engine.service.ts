import {
  CARD_LIBRARY,
  ENEMY_SPAWNS,
  HERO_DEF,
  STARTER_DECK,
} from "../data"
import { resolveCardEffects } from "./effects.service"
import { COLS, ROWS } from "../battle"
import type { CardInstance } from "../cards"
import type { FxEvent, GameState, LogEntry, Pos } from "../battle"
import type { Unit } from "../units"

let idSeed = 1
export const nid = (p: string) => `${p}_${idSeed++}`

export const BUY_COST = 3
const HAND_START = 5
const HAND_MAX = 8

/* ------------------------------------------------------------------ */
/* setup                                                               */
/* ------------------------------------------------------------------ */

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function makeCard(libId: string): CardInstance {
  return { uid: nid("c"), def: CARD_LIBRARY[libId] }
}

/**
 * Deterministic initial state used for the very first (server) render.
 * IMPORTANT: contains NO randomness so SSR and the first client render match.
 * The deck stays in starter order and the hand is empty until `startGame` runs
 * on the client after mount.
 */
export function createInitialState(): GameState {
  idSeed = 1
  const deck = STARTER_DECK.map(makeCard)
  const hand: CardInstance[] = []

  const hero: Unit = { ...HERO_DEF, id: "hero", pos: { x: 1, y: 2 } }
  const enemies: Unit[] = ENEMY_SPAWNS.map((e, i) => ({
    id: `enemy_${i}`,
    name: e.name,
    kind: e.kind,
    team: "enemy",
    pos: { x: e.x, y: e.y },
    hp: e.hp,
    maxHp: e.hp,
    atk: e.atk,
    move: e.move,
    range: 1,
    hasMoved: false,
    hasActed: false,
    buffAtk: 0,
  }))

  return {
    turn: 1,
    phase: "player",
    mana: 1,
    maxMana: 1,
    coin: 0,
    interest: 0,
    foreclosure: 15,
    foreclosureMax: 15,
    units: [hero, ...enemies],
    deck,
    hand,
    discard: [],
    spentCount: 0,
    log: [{ id: 0, turn: 1, text: "The ledger opens. Collect what you're owed.", tone: "gold" }],
    selectedUnitId: "hero",
    logCounter: 1,
  }
}

/**
 * Client-only game start: shuffle the deck and draw the opening hand.
 * Called from a useEffect after mount so the randomness never runs during
 * the server render (avoids hydration mismatches).
 */
export function startGame(base?: GameState): GameState {
  const s = base ?? createInitialState()
  const deck = shuffle(s.deck)
  const hand = deck.splice(0, HAND_START)
  return { ...s, deck, hand }
}

/* ------------------------------------------------------------------ */
/* helpers                                                             */
/* ------------------------------------------------------------------ */

export const posKey = (p: Pos) => `${p.x},${p.y}`
export const cellLabel = (p: Pos) => `${String.fromCharCode(65 + p.x)}${p.y + 1}`

export function unitAt(state: GameState, p: Pos): Unit | undefined {
  return state.units.find((u) => u.hp > 0 && u.pos.x === p.x && u.pos.y === p.y)
}

export function heroUnit(state: GameState): Unit | undefined {
  return state.units.find((u) => u.id === "hero")
}

function occupied(state: GameState): Set<string> {
  const s = new Set<string>()
  for (const u of state.units) if (u.hp > 0) s.add(posKey(u.pos))
  return s
}

function log(state: GameState, text: string, tone: LogEntry["tone"] = "neutral") {
  state.log = [...state.log, { id: state.logCounter++, turn: state.turn, text, tone }].slice(-40)
}

const inBounds = (p: Pos) => p.x >= 0 && p.x < COLS && p.y >= 0 && p.y < ROWS
const manhattan = (a: Pos, b: Pos) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y)

/** Orthogonal BFS reachable tiles for a unit, blocked by occupancy. */
export function reachableTiles(state: GameState, unitId: string): Pos[] {
  const u = state.units.find((x) => x.id === unitId)
  if (!u || u.hp <= 0) return []
  const blocked = occupied(state)
  const start = u.pos
  const seen = new Map<string, number>([[posKey(start), 0]])
  const queue: Pos[] = [start]
  const out: Pos[] = []
  while (queue.length) {
    const cur = queue.shift()!
    const dist = seen.get(posKey(cur))!
    if (dist >= u.move) continue
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const np = { x: cur.x + dx, y: cur.y + dy }
      if (!inBounds(np)) continue
      const k = posKey(np)
      if (seen.has(k)) continue
      if (blocked.has(k)) continue
      seen.set(k, dist + 1)
      out.push(np)
      queue.push(np)
    }
  }
  return out
}

function emptyTiles(state: GameState): Pos[] {
  const blocked = occupied(state)
  const out: Pos[] = []
  for (let y = 0; y < ROWS; y++)
    for (let x = 0; x < COLS; x++) {
      const p = { x, y }
      if (!blocked.has(posKey(p))) out.push(p)
    }
  return out
}

/* ------------------------------------------------------------------ */
/* deck                                                                */
/* ------------------------------------------------------------------ */

function drawCards(state: GameState, n: number, fx: FxEvent[]) {
  for (let i = 0; i < n; i++) {
    if (state.hand.length >= HAND_MAX) {
      log(state, "Your hand is full — a card is burned.", "bad")
      continue
    }
    if (state.deck.length === 0) {
      if (state.discard.length === 0) return
      state.deck = shuffle(state.discard)
      state.discard = []
      log(state, "The ledger is reshuffled.", "neutral")
    }
    const card = state.deck.shift()
    if (card) state.hand = [...state.hand, card]
  }
}

/* ------------------------------------------------------------------ */
/* damage / death                                                      */
/* ------------------------------------------------------------------ */

function effAtk(u: Unit) {
  return Math.max(0, u.atk + u.buffAtk)
}

function dealDamage(state: GameState, target: Unit, amount: number, fx: FxEvent[]) {
  target.hp = Math.max(0, target.hp - amount)
  fx.push({ id: state.logCounter, kind: "shock", to: { ...target.pos }, amount })
  if (target.hp <= 0) {
    fx.push({ id: state.logCounter, kind: "death", to: { ...target.pos } })
    log(state, `${target.name} at ${cellLabel(target.pos)} is wiped off the ledger.`, "good")
  }
}

function checkEnd(state: GameState) {
  const hero = heroUnit(state)
  const enemiesLeft = state.units.some((u) => u.team === "enemy" && u.hp > 0)
  if (!hero || hero.hp <= 0) {
    state.phase = "lost"
    log(state, "Guppy sleeps with the fishes. The mob wins.", "bad")
  } else if (!enemiesLeft) {
    state.phase = "won"
    log(state, "The whole crew is settled. The waters are yours.", "gold")
  } else if (state.foreclosure <= 0) {
    state.phase = "lost"
    log(state, "The Foreclosure clock hit zero. The mob takes everything.", "bad")
  }
}

/* ------------------------------------------------------------------ */
/* player actions                                                      */
/* ------------------------------------------------------------------ */

export function selectUnit(state: GameState, unitId: string | null): GameState {
  return { ...state, selectedUnitId: unitId }
}

export function moveUnit(
  state: GameState,
  unitId: string,
  dest: Pos,
): { state: GameState; fx: FxEvent[] } {
  const s = clone(state)
  const fx: FxEvent[] = []
  const u = s.units.find((x) => x.id === unitId)
  if (!u || u.team !== "player" || u.hasMoved) return { state, fx }
  const reachable = reachableTiles(s, unitId)
  if (!reachable.some((p) => p.x === dest.x && p.y === dest.y)) return { state, fx }
  fx.push({ id: s.logCounter, kind: "move", from: { ...u.pos }, to: { ...dest } })
  u.pos = { ...dest }
  u.hasMoved = true
  checkEnd(s)
  return { state: s, fx }
}

/** Basic melee/ranged attack by a player unit onto an enemy. */
export function unitAttack(
  state: GameState,
  attackerId: string,
  targetId: string,
): { state: GameState; fx: FxEvent[] } {
  const s = clone(state)
  const fx: FxEvent[] = []
  const a = s.units.find((x) => x.id === attackerId)
  const t = s.units.find((x) => x.id === targetId)
  if (!a || !t || a.team !== "player" || t.team !== "enemy" || a.hasActed) return { state, fx }
  if (manhattan(a.pos, t.pos) > a.range) return { state, fx }
  fx.push({ id: s.logCounter, kind: "melee", from: { ...a.pos }, to: { ...t.pos } })
  dealDamage(s, t, effAtk(a), fx)
  a.hasActed = true
  log(s, `${a.name} strikes ${t.name} for ${effAtk(a)}.`, "good")
  cleanupDead(s)
  checkEnd(s)
  return { state: s, fx }
}

export function canCast(state: GameState, card: CardInstance): boolean {
  return state.phase === "player" && card.def.cost <= state.mana
}

/** Which unit ids (or tiles) a card may target. */
export function cardTargets(state: GameState, card: CardInstance): {
  unitIds: string[]
  tiles: Pos[]
} {
  const t = card.def.target
  if (t === "enemy")
    return { unitIds: state.units.filter((u) => u.team === "enemy" && u.hp > 0).map((u) => u.id), tiles: [] }
  if (t === "ally")
    return { unitIds: state.units.filter((u) => u.team === "player" && u.hp > 0).map((u) => u.id), tiles: [] }
  if (t === "unit") return { unitIds: state.units.filter((u) => u.hp > 0).map((u) => u.id), tiles: [] }
  if (t === "empty-tile") return { unitIds: [], tiles: emptyTiles(state) }
  return { unitIds: [], tiles: [] } // self
}

export function castCard(
  state: GameState,
  cardUid: string,
  target: { unitId?: string; tile?: Pos },
): { state: GameState; fx: FxEvent[] } {
  const s = clone(state)
  const fx: FxEvent[] = []
  const idx = s.hand.findIndex((c) => c.uid === cardUid)
  if (idx < 0) return { state, fx }
  const card = s.hand[idx]
  if (card.def.cost > s.mana) return { state, fx }

  const hero = heroUnit(s)
  const from = hero ? { ...hero.pos } : undefined
  const tgtUnit = target.unitId ? s.units.find((u) => u.id === target.unitId) : undefined

  const valid = cardTargets(s, card)
  if (card.def.target !== "self") {
    if (card.def.target === "empty-tile") {
      if (!target.tile || !valid.tiles.some((p) => p.x === target.tile!.x && p.y === target.tile!.y))
        return { state, fx }
    } else if (!tgtUnit || !valid.unitIds.includes(tgtUnit.id)) {
      return { state, fx }
    }
  }

  // pay + move card to discard
  s.mana -= card.def.cost
  s.spentCount += 1
  s.hand = s.hand.filter((c) => c.uid !== cardUid)
  s.discard = [...s.discard, card]

  // delegate effect application to the data-driven resolver (FR-3) — no
  // switch on card id; effects come from the trusted JSON source.
  resolveCardEffects(s, card.def, { targetUnit: tgtUnit, tile: target.tile, from }, fx)

  cleanupDead(s)
  checkEnd(s)
  return { state: s, fx }
}

export function sellCard(state: GameState, cardUid: string): GameState {
  const s = clone(state)
  const idx = s.hand.findIndex((c) => c.uid === cardUid)
  if (idx < 0 || s.phase !== "player") return state
  const card = s.hand[idx]
  const gain = card.def.value + Math.floor(s.interest / 4)
  s.coin += gain
  s.hand = s.hand.filter((c) => c.uid !== cardUid)
  s.discard = [...s.discard, card]
  log(s, `Sold ${card.def.name} on the street for ${gain} coin.`, "gold")
  return s
}

export function buyCard(state: GameState): { state: GameState; fx: FxEvent[] } {
  const s = clone(state)
  const fx: FxEvent[] = []
  if (s.phase !== "player" || s.coin < BUY_COST) return { state, fx }
  if (s.hand.length >= HAND_MAX) return { state, fx }
  s.coin -= BUY_COST
  const hero = heroUnit(s)
  if (hero) fx.push({ id: s.logCounter, kind: "draw", to: { ...hero.pos } })
  drawCards(s, 1, fx)
  log(s, `Bought a card from the black market for ${BUY_COST} coin.`, "gold")
  return { state: s, fx }
}

/* ------------------------------------------------------------------ */
/* turn flow + enemy AI                                                */
/* ------------------------------------------------------------------ */

export function startEnemyPhase(state: GameState): GameState {
  const s = clone(state)
  s.phase = "enemy"
  return s
}

export interface EnemyStep {
  kind: "move" | "attack"
  unitId: string
  from?: Pos
  to?: Pos
  targetId?: string
  amount?: number
}

/** Deterministically plan the enemy turn against a simulated board. */
export function planEnemyTurn(state: GameState): EnemyStep[] {
  const steps: EnemyStep[] = []
  // simulate positions / hp locally
  const sim = state.units.map((u) => ({ ...u, pos: { ...u.pos } }))
  const alive = () => sim.filter((u) => u.hp > 0)
  const blockedSet = () => new Set(alive().map((u) => posKey(u.pos)))

  const players = () => alive().filter((u) => u.team === "player")
  const enemies = sim.filter((u) => u.team === "enemy")

  for (const e of enemies) {
    if (e.hp <= 0) continue
    const targets = players()
    if (targets.length === 0) break
    // nearest player
    let target = targets[0]
    let best = manhattan(e.pos, target.pos)
    for (const t of targets) {
      const d = manhattan(e.pos, t.pos)
      if (d < best) {
        best = d
        target = t
      }
    }

    // move greedily toward target (up to move range), not onto occupied tiles
    let steps_left = e.move
    while (steps_left > 0 && manhattan(e.pos, target.pos) > 1) {
      const blocked = blockedSet()
      blocked.delete(posKey(e.pos))
      const options: Pos[] = []
      for (const [dx, dy] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ]) {
        const np = { x: e.pos.x + dx, y: e.pos.y + dy }
        if (!inBounds(np)) continue
        if (blocked.has(posKey(np))) continue
        options.push(np)
      }
      if (options.length === 0) break
      options.sort((a, b) => manhattan(a, target.pos) - manhattan(b, target.pos))
      const next = options[0]
      if (manhattan(next, target.pos) >= manhattan(e.pos, target.pos)) break
      steps.push({ kind: "move", unitId: e.id, from: { ...e.pos }, to: { ...next } })
      e.pos = next
      steps_left--
    }

    // attack if adjacent
    if (manhattan(e.pos, target.pos) <= 1) {
      const dmg = Math.max(0, e.atk + e.buffAtk)
      steps.push({ kind: "attack", unitId: e.id, targetId: target.id, amount: dmg, to: { ...target.pos } })
      target.hp -= dmg
    }
  }
  return steps
}

/** Apply a single planned enemy step to real state, producing fx. */
export function applyEnemyStep(
  state: GameState,
  step: EnemyStep,
): { state: GameState; fx: FxEvent[] } {
  const s = clone(state)
  const fx: FxEvent[] = []
  const u = s.units.find((x) => x.id === step.unitId)
  if (!u || u.hp <= 0) return { state: s, fx }
  if (step.kind === "move" && step.to) {
    fx.push({ id: s.logCounter, kind: "move", from: { ...u.pos }, to: { ...step.to } })
    u.pos = { ...step.to }
  } else if (step.kind === "attack" && step.targetId) {
    const t = s.units.find((x) => x.id === step.targetId)
    if (t && t.hp > 0) {
      fx.push({ id: s.logCounter, kind: "melee", from: { ...u.pos }, to: { ...t.pos } })
      dealDamage(s, t, step.amount ?? 0, fx)
      log(s, `${u.name} hits ${t.name} for ${step.amount}.`, "bad")
    }
  }
  cleanupDead(s)
  checkEnd(s)
  return { state: s, fx }
}

/** Finish enemy phase → refresh for the player's next turn. */
export function beginPlayerTurn(state: GameState): GameState {
  const s = clone(state)
  const fx: FxEvent[] = []
  if (s.phase === "won" || s.phase === "lost") return s

  s.turn += 1
  s.interest += 1
  s.foreclosure = Math.max(0, s.foreclosure - 1)
  s.maxMana = Math.min(10, s.maxMana + 1)
  s.mana = s.maxMana
  s.spentCount = 0
  s.phase = "player"

  // refresh player units
  for (const u of s.units) {
    if (u.team === "player") {
      u.hasMoved = false
      u.hasActed = false
    } else {
      u.hasMoved = false
      u.hasActed = false
    }
  }

  drawCards(s, 1, fx)

  // escalation via interest
  if (s.interest > 0 && s.interest % 4 === 0) {
    for (const u of s.units) if (u.team === "enemy") u.buffAtk += 1
    log(s, "Interest compounds — the mob grows stronger (+1 ATK).", "bad")
  }

  checkEnd(s)
  return s
}

/* ------------------------------------------------------------------ */
/* internal                                                            */
/* ------------------------------------------------------------------ */

function cleanupDead(state: GameState) {
  // keep dead units out of occupancy but remove from array
  state.units = state.units.filter((u) => u.hp > 0)
}

/** structural clone that preserves function-free game state */
function clone(state: GameState): GameState {
  return {
    ...state,
    units: state.units.map((u) => ({ ...u, pos: { ...u.pos } })),
    deck: [...state.deck],
    hand: [...state.hand],
    discard: [...state.discard],
    log: [...state.log],
  }
}
