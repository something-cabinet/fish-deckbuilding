import { Phase } from "../enums"
import type { FxEvent, GameState, Pos } from "../models"
import { DEFAULT_COLS, DEFAULT_ROWS } from "../constants"
import { COIN_TURN_BASE, applyCardUpgrade, makeCard, type CardInstance } from "../../cards"
import { resolveCharacter } from "../../characters"
import { ENEMY_SPAWNS, heroDefFromCharacter, Team, type EnemySpawn, type Unit } from "../../units"
import { DEFAULT_HAND_SIZE, DEFAULT_HAND_MAX, shuffle } from "../../deck"
import { resetIds } from "../../shared"
import { getTrinketDef, resolveTrigger } from "../../trinkets"

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
  /** trinket def ids active in this battle */
  trinkets?: string[]
  /**
   * card library id -> upgrade level, bought with Fin at shop nodes (D11).
   * Applied deck-wide when the battle's deck is built below.
   */
  upgrades?: Record<string, number>
  /** the character being played; supplies hero stats and the fallback deck */
  characterId?: string
}): GameState {
  resetIds()
  // an unknown/stale id resolves to the default character rather than throwing,
  // so a save that names a character deleted in the designer still plays
  const character = resolveCharacter(overrides?.characterId)
  const upgrades = overrides?.upgrades ?? {}
  const deck = (overrides?.deck ?? character.starterDeck).map((id) => {
    const instance = makeCard(id)
    return { ...instance, def: applyCardUpgrade(instance.def, upgrades[id] ?? 0) }
  })
  const hand: CardInstance[] = []

  const cols = overrides?.cols ?? DEFAULT_COLS
  const rows = overrides?.rows ?? DEFAULT_ROWS
  const start = overrides?.heroStart ?? { x: 1, y: Math.floor(rows / 2) }

  const hero: Unit = {
    ...heroDefFromCharacter(character),
    id: "hero",
    // clamp so a stage that shrank below the stored start still spawns on board
    pos: {
      x: Math.max(0, Math.min(cols - 1, start.x)),
      y: Math.max(0, Math.min(rows - 1, start.y)),
    },
    hp: overrides?.heroHp ?? character.stats.maxHp,
    maxHp: overrides?.heroMaxHp ?? character.stats.maxHp,
  }
  const trinkets = overrides?.trinkets ?? []
  // apply stat modifiers from owned trinkets to the hero
  for (const id of trinkets) {
    const def = getTrinketDef(id)
    if (!def?.stats) continue
    if (def.stats.maxHp) {
      hero.maxHp += def.stats.maxHp
      hero.hp += def.stats.maxHp
    }
    if (def.stats.atk) hero.atk += def.stats.atk
    if (def.stats.move) hero.move += def.stats.move
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
    aiProfile: e.aiProfile,
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
    fxCounter: 1,
    handSize: DEFAULT_HAND_SIZE,
    handMax: DEFAULT_HAND_MAX,
    activeTrinkets: overrides?.trinkets ?? [],
    characterId: character.id,
  }
}

/**
 * Client-only game start: shuffle the deck and draw the opening hand.
 * Called from a useEffect after mount so the randomness never runs during
 * the server render (avoids hydration mismatches).
 *
 * Returns `{ state, fx }` so the caller can surface onCombatStart trinket
 * fx (FR-5/AC-5 — no dropped fx).
 */
export function startGame(base?: GameState): { state: GameState; fx: FxEvent[] } {
  const s = base ?? createInitialState()
  const deck = shuffle(s.deck)
  const hand = deck.splice(0, s.handSize)
  const state = { ...s, deck, hand }
  // fire onCombatStart trinket triggers after opening hand is drawn
  const fx: FxEvent[] = []
  resolveTrigger(state, state.activeTrinkets, "onCombatStart", fx)
  return { state, fx }
}

export function selectUnit(state: GameState, unitId: string | null): GameState {
  return { ...state, selectedUnitId: unitId }
}
