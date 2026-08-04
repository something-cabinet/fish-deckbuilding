import type { CardInstance } from "../../cards"
import type { Unit } from "../../units"
import type { LogEntry } from "./log-entry.interface"
import type { Phase } from "../enums/phase.enum"
import type { Pos } from "./pos.interface"

export interface GameState {
  turn: number
  phase: Phase
  /** per-turn resource spent to play cards; resets each turn (earned mainly by selling) */
  coin: number
  /** persistent run currency earned by defeating enemies; spent on future upgrades */
  fin: number
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
