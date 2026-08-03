import type { LogEntry } from "../battle"
import type { CardEffect } from "./card-effect.model"
import type { CardTarget } from "./card-target.model"
import type { CardType } from "./card-type.model"

export interface CardDef {
  id: string
  name: string
  type: CardType
  cost: number // mana
  value: number // gold return when sold
  target: CardTarget
  desc: string
  /** lucide icon name used in the card art */
  icon: string
  /** visual effect id fired on resolve */
  fx: "letter" | "phone" | "gavel" | "coin" | "draw" | "heal" | "shock" | "summon"
  /** data-driven effects applied in order by the resolver (FR-1) */
  effects: CardEffect[]
  /** resolution log template; {target} = target unit name, {tile} = cell label */
  log: string
  /** tone of the resolution log entry */
  logTone: LogEntry["tone"]
}
