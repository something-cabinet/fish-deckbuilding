import { Phase } from "../enums"
import type { GameState } from "../models"
import { makeCard, STARTER_DECK, type CardInstance } from "../../cards"
import { ENEMY_SPAWNS, HERO_DEF, Team, type EnemySpawn, type Unit } from "../../units"
import { HAND_START, shuffle } from "../../deck"
import { resetIds } from "../../shared"

export function createInitialState(overrides?: {
  heroHp?: number
  heroMaxHp?: number
  deck?: string[]
  enemies?: EnemySpawn[]
}): GameState {
  resetIds()
  const deck = overrides?.deck
    ? overrides.deck.map(makeCard)
    : STARTER_DECK.map(makeCard)
  const hand: CardInstance[] = []

  const hero: Unit = {
    ...HERO_DEF,
    id: "hero",
    pos: { x: 1, y: 2 },
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
    range: 1,
    hasMoved: false,
    hasActed: false,
    buffAtk: 0,
  }))

  return {
    turn: 1,
    phase: Phase.Player,
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

export function selectUnit(state: GameState, unitId: string | null): GameState {
  return { ...state, selectedUnitId: unitId }
}
