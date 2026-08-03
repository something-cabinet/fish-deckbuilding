import type { CardDef, Unit } from "./types"
import { CardPackSchema } from "./cards/schema"
import pack01 from "./cards/pack-01-starter.json"

/**
 * Card definitions ship as data-driven JSON packs (FR-7/FR-13, NFR-6/NFR-7).
 * Each pack is validated against the zod schema at module load (AC-4): a
 * malformed pack throws here rather than silently corrupting the game.
 * The pack order defines CARD_LIBRARY insertion order.
 */
const cardPacks = [pack01]

const parsedCardPacks = cardPacks.map((pack) => CardPackSchema.parse(pack))

export const CARD_LIBRARY: Record<string, CardDef> = Object.fromEntries(
  parsedCardPacks.flatMap((pack) =>
    pack.cards.map((card) => [card.id, card] as const),
  ),
)

/** The player's starting deck (list of card library ids, may repeat). */
export const STARTER_DECK: string[] = [
  "demand_letter",
  "demand_letter",
  "demand_letter",
  "collection_call",
  "collection_call",
  "foreclose",
  "foreclose",
  "kneecap",
  "kneecap",
  "cash_flow",
  "cash_flow",
  "market_rate",
  "market_rate",
  "loan_shark",
  "hush_money",
  "muscle",
  "muscle",
]

export const HERO_DEF: Omit<Unit, "id" | "pos"> = {
  name: "Guppy",
  kind: "hero",
  team: "player",
  hp: 14,
  maxHp: 14,
  atk: 2,
  move: 2,
  range: 1,
  hasMoved: false,
  hasActed: false,
  buffAtk: 0,
}

export interface EnemySpawn {
  name: string
  kind: Unit["kind"]
  x: number
  y: number
  hp: number
  atk: number
  move: number
}

export const ENEMY_SPAWNS: EnemySpawn[] = [
  { name: "Thug", kind: "thug", x: 6, y: 1, hp: 4, atk: 2, move: 2 },
  { name: "Thug", kind: "thug", x: 6, y: 3, hp: 4, atk: 2, move: 2 },
  { name: "Enforcer", kind: "enforcer", x: 7, y: 0, hp: 6, atk: 3, move: 2 },
  { name: "Enforcer", kind: "enforcer", x: 7, y: 4, hp: 6, atk: 3, move: 2 },
  { name: "The Boss", kind: "boss", x: 8, y: 2, hp: 16, atk: 4, move: 1 },
]

export const GOON_DEF = { name: "Goon", kind: "goon" as const, hp: 5, atk: 2, move: 2 }
