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
    label: "Damage Priority",
    hint:
      "How much a bigger hit is worth when comparing its options, on its own — " +
      "separate from whether that hit lands a kill. " +
      "High: always takes its hardest-hitting attack in range, even one that leaves the target standing. " +
      "Low (near 0): damage barely factors in, so it'll take a safer or repositioning play over a big swing.",
    min: 0,
    max: 10,
    step: 0.5,
  },
  [AiScorer.KillSecured]: {
    label: "Prioritize Kills",
    hint:
      "How much it wants to land a finishing blow on any unit — an ally summon or the hero — " +
      "regardless of how much raw damage that attack deals. " +
      "High: picks off a 1-HP summon over a bigger hit on the hero, because closing out a kill outweighs damage. " +
      "Low (near 0): whether an attack finishes something off doesn't matter, it's judged on damage and safety alone.",
    min: 0,
    max: 20,
    step: 1,
  },
  [AiScorer.LethalOnHero]: {
    label: "Finish the Hero",
    hint:
      "How strongly it chases a killing blow on the hero over any other option. " +
      "High: walks past a free kill on a weaker unit to end the fight now. " +
      "Low (near 0): a lethal swing on the hero is scored like any other attack, no rush to close it out.",
    min: 0,
    max: 2000,
    step: 100,
  },
  [AiScorer.SelfPreservation]: {
    label: "Avoid Danger",
    hint:
      "How much it avoids ending its turn on a tile the player could already hit next turn. " +
      "High: retreats out of the player's reach even if that means skipping an attack this turn. " +
      "Low (near 0): ignores incoming danger entirely. " +
      "Negative: prefers exposed tiles instead — only useful for a bait or suicidal archetype.",
    min: -5,
    max: 10,
    step: 0.5,
  },
  [AiScorer.DistanceToTarget]: {
    label: "Close the Gap",
    hint:
      "How much it values ending its move nearer to the closest foe, even before it's in attack range. " +
      "High (positive): walks toward the fight every turn it isn't already adjacent. " +
      "Low (negative): backs away instead — useful for a unit that wants to keep its distance or kite. " +
      "Zero: distance doesn't factor into the decision at all.",
    min: -5,
    max: 5,
    step: 0.5,
  },
  [AiScorer.AllyClustering]: {
    label: "Stay With Allies",
    hint:
      "How much it wants to end its turn next to other living enemies. " +
      "High (positive): clumps up beside allies — good for a unit that buffs or shields its neighbors. " +
      "Low (negative): spreads out instead, so one AoE card can't catch two of them at once. " +
      "Zero: it doesn't care who's nearby.",
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
