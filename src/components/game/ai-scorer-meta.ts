import { AiArchetype, AiScorer } from "@/lib/game/units"

/**
 * Designer-facing presentation for each AI scoring axis.
 *
 * The engine names axes after what they measure (`distanceToTarget`); a
 * designer thinks in terms of what the enemy *feels* like (`Aggression`).
 * This table is the translation, and lives in the component layer because the
 * engine has no business knowing about slider bounds.
 *
 * Declared as a full Record so a new `AiScorer` member fails the build here
 * rather than silently missing from the editor.
 */
export interface AiScorerMeta {
  label: string
  hint: string
  min: number
  max: number
  step: number
}

export const AI_SCORER_META: Record<AiScorer, AiScorerMeta> = {
  [AiScorer.DamageDealt]: {
    label: "Bloodlust",
    hint: "how much raw damage is worth",
    min: 0,
    max: 10,
    step: 0.5,
  },
  [AiScorer.KillSecured]: {
    label: "Finisher",
    hint: "prefers actions that land a kill",
    min: 0,
    max: 20,
    step: 1,
  },
  [AiScorer.LethalOnHero]: {
    label: "Killer Instinct",
    hint: "how hard it lunges at a winning blow",
    min: 0,
    max: 2000,
    step: 100,
  },
  [AiScorer.SelfPreservation]: {
    label: "Caution",
    hint: "avoids tiles the player threatens",
    min: -5,
    max: 10,
    step: 0.5,
  },
  [AiScorer.DistanceToTarget]: {
    label: "Aggression",
    hint: "positive closes in, negative kites away",
    min: -5,
    max: 5,
    step: 0.5,
  },
  [AiScorer.AllyClustering]: {
    label: "Pack Instinct",
    hint: "positive sticks to allies, negative spreads out",
    min: -5,
    max: 5,
    step: 0.5,
  },
}

/** Ordered for the editor: the axes a designer reaches for most sit on top. */
export const AI_SCORER_ORDER: AiScorer[] = [
  AiScorer.DistanceToTarget,
  AiScorer.DamageDealt,
  AiScorer.SelfPreservation,
  AiScorer.AllyClustering,
  AiScorer.KillSecured,
  AiScorer.LethalOnHero,
]

export const AI_ARCHETYPE_META: Record<AiArchetype, { label: string; hint: string }> = {
  [AiArchetype.Brawler]: { label: "Brawler", hint: "Walks at you and swings." },
  [AiArchetype.Skirmisher]: { label: "Skirmisher", hint: "Presses in, but won't stand in danger." },
  [AiArchetype.Artillery]: { label: "Artillery", hint: "Backs off and shoots. Needs Ranged." },
  [AiArchetype.Guardian]: { label: "Guardian", hint: "Holds the line beside its allies." },
  [AiArchetype.Berserker]: { label: "Berserker", hint: "All offence, no self-preservation." },
}
