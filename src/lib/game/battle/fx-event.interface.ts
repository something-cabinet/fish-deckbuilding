import type { CardDef } from "../cards"
import type { Pos } from "./pos.interface"

/** A transient visual effect the UI plays and then discards. */
export interface FxEvent {
  id: number
  kind: CardDef["fx"] | "melee" | "move" | "death"
  from?: Pos
  to?: Pos
  amount?: number
  color?: string
}
