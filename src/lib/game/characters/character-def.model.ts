/** The three battle stats a character is authored with. */
export interface CharacterStats {
  /** starting and maximum HP for the run */
  maxHp: number
  /** melee damage dealt by a basic attack */
  atk: number
  /** squares the hero may move in one round */
  move: number
}

/**
 * A playable hero. One is picked at the start of a run; its stats seed the
 * battle hero and its starter deck seeds the run deck.
 */
export interface CharacterDef {
  id: string
  name: string
  /** short epithet shown under the name, e.g. "The Debtor" */
  title: string
  description: string
  /** sprite base name under `public/sprites/`, e.g. "hero" -> hero.png */
  icon: string
  stats: CharacterStats
  /** card library ids, may repeat — the deck the run starts with */
  starterDeck: string[]
}
