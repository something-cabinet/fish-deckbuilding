import type { FxKind, LogEntry } from "../../battle"
import type { CardEffect } from "./card-effect.model"
import type { CardTarget } from "../enums/card-target.enum"
import type { CardType } from "../enums/card-type.enum"

export interface CardDef {
  id: string
  name: string
  type: CardType
  cost: number // mana
  value: number // gold return when sold
  target: CardTarget
  /**
   * Cast range in orthogonal steps (Manhattan distance) from the caster
   * (hero). 1 = melee: the 4 orthogonally adjacent tiles. Never 0 — a card
   * must always be able to reach something other than its own tile.
   */
  range: number
  /**
   * Blast radius in orthogonal steps (Manhattan distance) around the aimed
   * tile. 0 = a single tile, 1 = 5 tiles, 2 = 13 tiles. Any radius above 0
   * makes the card aim at tiles instead of units.
   */
  aoe: number
  desc: string
  /** lucide icon name, drawn only when the card's artwork is missing */
  icon: string
  /**
   * Base name of a PNG in `public/card-art/` (640x400, 16:10). Omitted cards
   * fall back to the generic art for their type.
   */
  art?: string
  /** visual effect id fired on resolve */
  fx: FxKind
  /** data-driven effects applied in order by the resolver (FR-1) */
  effects: CardEffect[]
  /** resolution log template; {target} = target unit name, {tile} = cell label */
  log: string
  /** tone of the resolution log entry */
  logTone: LogEntry["tone"]
}
