/**
 * Named presets that seed an enemy's {@link AiScorer} weight vector. An
 * archetype is not behaviour of its own — it is only a starting point the
 * designer can override key-by-key via `aiProfile.weights`.
 *
 * Explicit string values: authored in `enemy-database.json`.
 */
export enum AiArchetype {
  /** Closes distance and swings. The historical default for every enemy. */
  Brawler = "brawler",
  /** Approaches but avoids standing in threatened tiles; spreads out. */
  Skirmisher = "skirmisher",
  /** Wants maximum distance while still in attack range. Needs `range > 1`. */
  Artillery = "artillery",
  /** Sticks to allies and holds the line rather than chasing kills. */
  Guardian = "guardian",
  /** All offence, ignores its own safety entirely. */
  Berserker = "berserker",
}
