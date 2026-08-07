import { AiArchetype } from "../enums/ai-archetype.enum"
import { AiScorer } from "../enums/ai-scorer.enum"
import type { EnemyAiProfile } from "../models/ai-profile.interface"

/**
 * Preset weight vectors, one per archetype. Every scorer is listed explicitly
 * so a newly added `AiScorer` member fails the build here rather than silently
 * defaulting to 0 for every enemy in the game.
 */
export const ARCHETYPE_WEIGHTS: Record<AiArchetype, Record<AiScorer, number>> = {
  [AiArchetype.Brawler]: {
    [AiScorer.DamageDealt]: 2,
    [AiScorer.KillSecured]: 6,
    [AiScorer.LethalOnHero]: 1000,
    [AiScorer.SelfPreservation]: 0,
    [AiScorer.DistanceToTarget]: 1,
    [AiScorer.AllyClustering]: 0,
  },
  [AiArchetype.Skirmisher]: {
    [AiScorer.DamageDealt]: 2,
    [AiScorer.KillSecured]: 6,
    [AiScorer.LethalOnHero]: 1000,
    [AiScorer.SelfPreservation]: 3,
    [AiScorer.DistanceToTarget]: 1,
    [AiScorer.AllyClustering]: -1,
  },
  [AiArchetype.Artillery]: {
    [AiScorer.DamageDealt]: 2,
    [AiScorer.KillSecured]: 6,
    [AiScorer.LethalOnHero]: 1000,
    [AiScorer.SelfPreservation]: 4,
    // negative: value is *negated* distance, so this pays to stay far away
    [AiScorer.DistanceToTarget]: -2,
    [AiScorer.AllyClustering]: -1,
  },
  [AiArchetype.Guardian]: {
    [AiScorer.DamageDealt]: 1.5,
    [AiScorer.KillSecured]: 4,
    [AiScorer.LethalOnHero]: 1000,
    [AiScorer.SelfPreservation]: 1,
    [AiScorer.DistanceToTarget]: 0.5,
    [AiScorer.AllyClustering]: 2,
  },
  [AiArchetype.Berserker]: {
    [AiScorer.DamageDealt]: 3,
    [AiScorer.KillSecured]: 8,
    [AiScorer.LethalOnHero]: 1000,
    [AiScorer.SelfPreservation]: -1,
    [AiScorer.DistanceToTarget]: 2,
    [AiScorer.AllyClustering]: 0,
  },
}

/** Applied to any enemy authored without an `aiProfile`. */
export const DEFAULT_AI_PROFILE: EnemyAiProfile = { archetype: AiArchetype.Brawler }

/** Resolve an enemy's effective weight vector: archetype preset + overrides. */
export function resolveAiWeights(profile?: EnemyAiProfile): Record<AiScorer, number> {
  const p = profile ?? DEFAULT_AI_PROFILE
  return { ...ARCHETYPE_WEIGHTS[p.archetype], ...p.weights }
}
