import type { Pos } from "./pos.interface"
import type { FxKind } from "../enums/fx-kind.enum"

/** A transient visual effect the UI plays and then discards. */
export interface FxEvent {
  id: number
  kind: FxKind
  from?: Pos
  to?: Pos
  amount?: number
  color?: string
}
