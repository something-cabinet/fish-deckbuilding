/**
 * Axes the enemy AI scores every candidate action against.
 *
 * Each scorer yields a raw value where **higher is always better for the
 * enemy**, so a designer weight is a plain multiplier: positive amplifies the
 * behaviour, negative inverts it. Keeping the sign convention uniform is what
 * lets an archetype be a flat vector of numbers instead of code.
 *
 * Explicit string values: these members are authored as object keys inside
 * `aiProfile.weights` in `enemy-database.json`, so they must equal the external
 * strings (conventions: explicit enum values allowed when tied to a JSON pack).
 */
export enum AiScorer {
  /** Damage this action deals to its target. 0 when the candidate does not attack. */
  DamageDealt = "damageDealt",
  /** 1 when the attack reduces the target to 0 HP, else 0. */
  KillSecured = "killSecured",
  /** 1 when the attack kills the hero — i.e. this action wins the battle. */
  LethalOnHero = "lethalOnHero",
  /** Negated incoming threat on the destination tile: higher = safer to stand there. */
  SelfPreservation = "selfPreservation",
  /** Negated distance to the nearest player unit: higher = closer. Invert to kite. */
  DistanceToTarget = "distanceToTarget",
  /** Count of living allies adjacent to the destination. Invert to spread out. */
  AllyClustering = "allyClustering",
}
