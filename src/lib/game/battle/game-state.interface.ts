import type { CardInstance } from "../cards"
import type { Unit } from "../units"
import type { LogEntry } from "./log-entry.interface"
import type { Phase } from "./phase.model"
import type { Pos } from "./pos.interface"

export interface GameState {
  turn: number
  phase: Phase
  mana: number
  maxMana: number
  coin: number
  interest: number
  foreclosure: number // turns remaining before the mob forecloses
  foreclosureMax: number
  units: Unit[]
  deck: CardInstance[]
  hand: CardInstance[]
  discard: CardInstance[]
  spentCount: number
  log: LogEntry[]
  selectedUnitId: string | null
  logCounter: number
}
