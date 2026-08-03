export const COLS = 9 // A..I
export const ROWS = 5 // 1..5

export type Team = "player" | "enemy"
export type UnitKind = "hero" | "goon" | "thug" | "enforcer" | "boss"

export interface Pos {
  x: number // 0..COLS-1
  y: number // 0..ROWS-1
}

export interface Unit {
  id: string
  name: string
  kind: UnitKind
  team: Team
  pos: Pos
  hp: number
  maxHp: number
  atk: number
  move: number
  range: number // basic attack range (1 = melee)
  hasMoved: boolean
  hasActed: boolean
  buffAtk: number
}

export type CardType = "attack" | "skill" | "summon"

/** How a card is aimed by the player. */
export type CardTarget =
  | "enemy" // any enemy unit
  | "ally" // any friendly unit (incl. hero)
  | "unit" // any unit
  | "self" // no target, affects hero / global
  | "empty-tile" // an empty tile (summons)

/** A single data-driven effect a card applies at resolution (D1/D5/D11). */
export type CardEffect =
  | { kind: "damage"; amount: number }
  | { kind: "heal"; amount: number; target: "caster" | "cast-target" }
  | { kind: "drawCards"; amount: number }
  | { kind: "gainCoin"; amount: number }
  | { kind: "buffAtk"; amount: number } // signed
  | { kind: "summon"; unit: "goon" }
  | { kind: "custom"; handlerId: string } // D11 escape hatch — registered handler

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

export interface CardInstance {
  uid: string
  def: CardDef
}

export type Phase = "player" | "enemy" | "won" | "lost"

export interface LogEntry {
  id: number
  turn: number
  text: string
  tone: "neutral" | "good" | "bad" | "gold"
}

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

/** A transient visual effect the UI plays and then discards. */
export interface FxEvent {
  id: number
  kind: CardDef["fx"] | "melee" | "move" | "death"
  from?: Pos
  to?: Pos
  amount?: number
  color?: string
}
