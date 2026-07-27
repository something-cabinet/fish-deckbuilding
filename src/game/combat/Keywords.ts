import type { CardDef, Keyword } from './CardTypes';

export type { Keyword } from './CardTypes';

export interface KeywordContext {
  card: CardDef;
  attacker?: { id: string; name: string; attack: number; hp: number };
  heroHp: number;
  heroMaxHp: number;
  coins: number;
  creditLimit: number;
  handSize: number;
}

export interface KeywordResult {
  bonusDamage?: number;  // Additional damage (e.g., from double_strike)
  healAmount?: number;   // HP to heal (e.g., from lifesteal)
  coinBonus?: number;    // Bonus coins (future)
  drawBonus?: number;    // Extra draws (future)
  pierce?: boolean;      // Ignores enemy block/defense
  taunt?: boolean;       // Must be targeted first (future: UI enforcement)
  overdraft?: boolean;   // Can exceed credit limit (for card play)
}

/**
 * Resolve all keywords on a card given the current context.
 * Pure function — returns a KeywordResult describing what effects the keywords produce.
 *
 * Keyword effects:
 * - rush:       No additional effect in current system
 * - taunt:      Sets taunt flag for future UI enforcement
 * - pierce:     Sets pierce flag to ignore enemy defense
 * - lifesteal:  Heals hero for half of total damage dealt (rounded up)
 * - double_strike: Adds bonus damage equal to base attack
 * - overdraft:  Sets overdraft flag for credit limit bypass
 */
export function resolveKeywords(card: CardDef, context: KeywordContext): KeywordResult {
  const result: KeywordResult = {};

  if (!card.keywords || card.keywords.length === 0) {
    return result;
  }

  const kwSet = new Set(card.keywords);

  // Calculate damage bonus from double_strike first
  if (kwSet.has('double_strike')) {
    result.bonusDamage = card.attack;
  }

  // Total damage after keyword modifiers
  const totalDamage = card.attack + (result.bonusDamage ?? 0);

  // Calculate derived effects based on total damage
  if (kwSet.has('lifesteal')) {
    result.healAmount = Math.ceil(totalDamage / 2);
  }

  // Set flags
  if (kwSet.has('pierce')) {
    result.pierce = true;
  }

  if (kwSet.has('taunt')) {
    result.taunt = true;
  }

  if (kwSet.has('overdraft')) {
    result.overdraft = true;
  }

  return result;
}
