import type { TrinketDef } from "./trinket-def.model"
import { TrinketPackSchema } from "./data/trinket-schema.helper"
import trinketDb from "./data/trinket-database.json"

/**
 * Authored trinkets ship as a JSON database validated at module load, matching
 * how cards, enemies and stages are loaded — so the Game Design tool can write
 * the file and a malformed entry throws here rather than mid-run.
 */
export const TRINKET_DEFS: TrinketDef[] = TrinketPackSchema.parse(trinketDb).trinkets

export const TRINKET_LIBRARY: Record<string, TrinketDef> = Object.fromEntries(
  TRINKET_DEFS.map((def) => [def.id, def]),
)

export const TRINKET_IDS = Object.keys(TRINKET_LIBRARY)

export function getTrinketDef(id: string): TrinketDef | undefined {
  return TRINKET_LIBRARY[id]
}

export const TRINKET_RARITY_ORDER: Record<string, number> = {
  common: 0,
  uncommon: 1,
  rare: 2,
}

export function trinketRarityWeight(rarity: string): number {
  switch (rarity) {
    case "common":
      return 50
    case "uncommon":
      return 35
    case "rare":
      return 15
    default:
      return 0
  }
}

export function trinketPrice(rarity: string): number {
  switch (rarity) {
    case "common":
      return 30
    case "uncommon":
      return 45
    case "rare":
      return 70
    default:
      return 30
  }
}

export const TRINKET_ICONS: Record<string, string> = Object.fromEntries(
  TRINKET_DEFS.map((def) => [def.id, def.icon]),
)
