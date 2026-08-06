import { nid } from "../../shared"
import { CardPackSchema } from "./schema.helper"
import type { CardDef, CardInstance } from "../models"
import userCards from "../card-database.json"

/**
 * Card definitions ship as a data-driven JSON database (FR-7/FR-13, NFR-6/NFR-7).
 * The file is validated against the zod schema at module load (AC-4): a
 * malformed entry throws here rather than silently corrupting the game.
 * The array order defines CARD_LIBRARY insertion order.
 */
const cardPacks = [userCards]

const parsedCardPacks = cardPacks.map((pack) => CardPackSchema.parse(pack))

export const CARD_LIBRARY: Record<string, CardDef> = Object.fromEntries(
  parsedCardPacks.flatMap((pack) =>
    pack.cards.map((card) => [card.id, card] as const),
  ),
)

export function makeCard(libId: string): CardInstance {
  return { uid: nid("c"), def: CARD_LIBRARY[libId] }
}
