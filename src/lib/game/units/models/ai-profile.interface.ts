import type { AiArchetype } from "../enums/ai-archetype.enum"
import type { AiScorer } from "../enums/ai-scorer.enum"

/**
 * The whole of an enemy's "personality" as far as the AI is concerned.
 *
 * The planner is one shared engine; what differs per enemy is only how it
 * weighs the scorers. Anything that cannot be expressed as a weight (a boss
 * phase change, a scripted opener) belongs in a future scripted-rule layer,
 * not here.
 */
export interface EnemyAiProfile {
  archetype: AiArchetype
  /** Per-scorer overrides applied on top of the archetype's preset vector. */
  weights?: Partial<Record<AiScorer, number>>
}
