import type { GameState, LogEntry, Pos } from "../../battle/models"
import type { Unit } from "../../units"

let idSeed = 1
export const nid = (p: string) => `${p}_${idSeed++}`

export function resetIds(): void {
  idSeed = 1
}

export const posKey = (p: Pos) => `${p.x},${p.y}`
export const cellLabel = (p: Pos) => `${String.fromCharCode(65 + p.x)}${p.y + 1}`

export function heroUnit(state: GameState): Unit | undefined {
  return state.units.find((u) => u.id === "hero")
}

export function log(state: GameState, text: string, tone: LogEntry["tone"] = "neutral") {
  state.log = [...state.log, { id: state.logCounter++, turn: state.turn, text, tone }].slice(-40)
}

/** structural clone that preserves function-free game state */
export function clone(state: GameState): GameState {
  return {
    ...state,
    units: state.units.map((u) => ({ ...u, pos: { ...u.pos } })),
    deck: [...state.deck],
    hand: [...state.hand],
    discard: [...state.discard],
    log: [...state.log],
  }
}
