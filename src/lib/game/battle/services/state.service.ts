import { Phase } from "../enums"
import type { GameState, Pos } from "../models"
import { DEFAULT_COLS, DEFAULT_ROWS } from "../constants"
import { COIN_TURN_BASE, makeCard, STARTER_DECK, type CardInstance } from "../../cards"
import { ENEMY_SPAWNS, HERO_DEF, Team, type EnemySpawn, type Unit } from "../../units"
import { HAND_START, shuffle } from "../../deck"
import { resetIds } from "../../shared"

export function createInitialState(overrides?: {
  heroHp?: number
  heroMaxHp?: number
  deck?: string[]
  enemies?: EnemySpawn[]
  /** run-scoped Fin carried in from the overworld (spec D11) */
  fin?: number
  /** board size, supplied by the stage the battle was built from */
  cols?: number
  rows?: number
  /** where the hero starts; clamped into the board below */
  heroStart?: Pos
}): GameState {
  resetIds()
  const deck = overrides?.deck
    ? overrides.deck.map(makeCard)
    : STARTER_DECK.map(makeCard)
  const hand: CardInstance[] = []

  const cols = overrides?.cols ?? DEFAULT_COLS
  const rows = overrides?.rows ?? DEFAULT_ROWS
  const start = overrides?.heroStart ?? { x: 1, y: Math.floor(rows / 2) }

  const hero: Unit = {
    ...HERO_DEF,
    id: "hero",
    // clamp so a stage that shrank below the stored start still spawns on board
    pos: {
      x: Math.max(0, Math.min(cols - 1, start.x)),
      y: Math.max(0, Math.min(rows - 1, start.y)),
    },
    hp: overrides?.heroHp ?? HERO_DEF.hp,
    maxHp: overrides?.heroMaxHp ?? HERO_DEF.maxHp,
  }
  const spawns = overrides?.enemies ?? ENEMY_SPAWNS
  const enemies: Unit[] = spawns.map((e, i) => ({
    id: `enemy_${i}`,
    name: e.name,
    kind: e.kind,
    team: Team.Enemy,
    pos: { x: e.x, y: e.y },
    hp: e.hp,
    maxHp: e.hp,
    atk: e.atk,
    move: e.move,
    range: e.range ?? 1,
    hasMoved: false,
    hasActed: false,
    buffAtk: 0,
  }))

  return {
    turn: 1,
    phase: Phase.Player,
    cols,
    rows,
    coin: COIN_TURN_BASE,
    fin: overrides?.fin ?? 0,
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

export function selectUnit(state: GameState, unitId: string | null): GameState {
  return { ...state, selectedUnitId: unitId }
}
