import type { CardEffect, EffectType } from './CardTypes';

export type { CardEffect, EffectType } from './CardTypes';

export interface EffectContext {
  heroHp: number;
  heroMaxHp: number;
  coins: number;
  handSize: number;
  deckSize: number;
  enemiesAlive: number;
}

export interface EffectResult {
  damageToEnemy: number;     // Total damage to apply to target
  healHero: number;          // HP to restore (capped at max HP)
  drawCards: number;         // Cards to draw
  coinsGained: number;       // Coins to add
  buffsToApply: Array<{ type: string; value: number }>;   // Future
  debuffsToApply: Array<{ type: string; value: number }>; // Future
}

/**
 * Resolve a list of card effects given the current game context.
 * Pure function — returns an EffectResult describing what should happen.
 * Does NOT mutate any state.
 */
export function resolveEffects(effects: CardEffect[], context: EffectContext): EffectResult {
  const result: EffectResult = {
    damageToEnemy: 0,
    healHero: 0,
    drawCards: 0,
    coinsGained: 0,
    buffsToApply: [],
    debuffsToApply: [],
  };

  for (const effect of effects) {
    switch (effect.type) {
      case 'damage':
        result.damageToEnemy += effect.value;
        break;
      case 'heal': {
        // Cap healing at max HP
        const missingHp = context.heroMaxHp - context.heroHp;
        result.healHero += Math.min(effect.value, Math.max(0, missingHp));
        break;
      }
      case 'draw':
        result.drawCards += effect.value;
        break;
      case 'gainCoins':
        result.coinsGained += effect.value;
        break;
      case 'applyBuff':
        result.buffsToApply.push({ type: 'buff', value: effect.value });
        break;
      case 'applyDebuff':
        result.debuffsToApply.push({ type: 'debuff', value: effect.value });
        break;
    }
  }

  return result;
}
