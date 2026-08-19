import type { CharacterDef } from "./character-def.model"
import { CharacterPackSchema } from "./data/character-schema.helper"
import characterDb from "./data/character-database.json"

/**
 * Playable characters ship as a JSON database validated at module load, the
 * same way cards, enemies, stages and trinkets are loaded — so the Game Design
 * tool can write the file and a malformed entry throws here rather than when a
 * run tries to start.
 */
export const CHARACTER_DEFS: CharacterDef[] = CharacterPackSchema.parse(characterDb).characters

export const CHARACTER_LIBRARY: Record<string, CharacterDef> = Object.fromEntries(
  CHARACTER_DEFS.map((def) => [def.id, def]),
)

export const CHARACTER_IDS = Object.keys(CHARACTER_LIBRARY)

/**
 * Used when the database is empty — deleting every character in the designer
 * must not leave a run with no hero to build.
 */
export const FALLBACK_CHARACTER: CharacterDef = {
  id: "fallback_hero",
  name: "Guppy",
  title: "The Debtor",
  description: "A stand-in hero, used only when no character has been authored.",
  icon: "hero",
  stats: { maxHp: 14, atk: 2, move: 2 },
  starterDeck: [],
}

/** The character a run starts as when none was chosen (first authored one). */
export const DEFAULT_CHARACTER: CharacterDef = CHARACTER_DEFS[0] ?? FALLBACK_CHARACTER

export const DEFAULT_CHARACTER_ID = DEFAULT_CHARACTER.id

export function getCharacterDef(id: string): CharacterDef | undefined {
  return CHARACTER_LIBRARY[id]
}

/** The character for an id, falling back to the default for unknown/stale ids. */
export function resolveCharacter(id?: string): CharacterDef {
  return (id ? CHARACTER_LIBRARY[id] : undefined) ?? DEFAULT_CHARACTER
}
