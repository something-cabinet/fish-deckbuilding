import type { SummonDef } from "./summon-def.model"
import { SummonPackSchema } from "./data/summon-schema.helper"
import summonDb from "./data/summon-database.json"

/**
 * Summon templates ship as a JSON database validated at module load, the same
 * way cards, enemies and characters are loaded — so the Game Design tool can
 * write the file and a malformed entry throws here rather than mid-battle.
 */
export const SUMMON_DEFS: SummonDef[] = SummonPackSchema.parse(summonDb).summons

export const SUMMON_LIBRARY: Record<string, SummonDef> = Object.fromEntries(
  SUMMON_DEFS.map((def) => [def.id, def]),
)

export const SUMMON_IDS = Object.keys(SUMMON_LIBRARY)

/** Used when a card references a summon id that no longer exists. */
export const FALLBACK_SUMMON: SummonDef = {
  id: "fallback_goon",
  name: "Goon",
  hp: 5,
  atk: 2,
  move: 2,
  range: 1,
  icon: "goon",
}

/** The summon used when a card doesn't specify one (first authored template). */
export const DEFAULT_SUMMON: SummonDef = SUMMON_DEFS[0] ?? FALLBACK_SUMMON

export function getSummonDef(id: string): SummonDef | undefined {
  return SUMMON_LIBRARY[id]
}

/** The summon for an id, falling back to the default for unknown/stale ids. */
export function resolveSummon(id?: string): SummonDef {
  return (id ? SUMMON_LIBRARY[id] : undefined) ?? DEFAULT_SUMMON
}
