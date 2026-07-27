import type { CardEffect, EffectType } from './CardTypes';

export type RelicTrigger =
  | 'onTurnStart'      // Trigger at start of each player turn
  | 'onTurnEnd'        // Trigger at end of player turn
  | 'onCombatStart'    // Trigger at battle start
  | 'onCardPlayed'     // Trigger when a card is played
  | 'onDamageDealt'    // Trigger when hero deals damage
  | 'onDamageTaken'    // Trigger when hero takes damage
  | 'onEnemyKilled';   // Trigger when an enemy dies

export interface RelicEffectDef {
  trigger: RelicTrigger;
  effect: EffectType;
  value: number;
  chance?: number;  // Percentage chance (1-100) for proc-based relics
}

export interface RelicDef {
  id: string;
  name: string;
  description: string;
  effects: RelicEffectDef[];
  color: string;
  rarity: 'common' | 'uncommon' | 'rare';
}

/**
 * Resolve all relic effects that match the given trigger.
 * Pure function — returns an array of CardEffect that should be applied.
 *
 * For chance-based relics (e.g., Pearl Necklace with 10% chance),
 * pass a randomRoll (1-100) to determine if the effect procs.
 * If randomRoll is omitted, chance-based effects are skipped.
 */
export function resolveRelicTrigger(
  trigger: RelicTrigger,
  relics: RelicDef[],
  randomRoll?: number,
): CardEffect[] {
  const effects: CardEffect[] = [];

  for (const relic of relics) {
    for (const re of relic.effects) {
      if (re.trigger !== trigger) continue;

      // Handle chance-based relics
      if (re.chance !== undefined && re.chance > 0) {
        // If no random roll provided, skip chance effects
        if (randomRoll === undefined) continue;
        // Check if the roll is within the chance threshold
        if (randomRoll > re.chance) continue;
      }

      effects.push({ type: re.effect, value: re.value, target: 'hero' });
    }
  }

  return effects;
}

/**
 * Check if a damage reduction relic applies (e.g., Golden Scales).
 * Returns the amount of damage to reduce, or 0.
 */
export function resolveDamageReduction(relics: RelicDef[], incomingDamage: number): number {
  let reduction = 0;
  for (const relic of relics) {
    for (const re of relic.effects) {
      if (re.trigger === 'onDamageTaken') {
        reduction += re.value;
      }
    }
  }
  return Math.min(reduction, incomingDamage);
}
