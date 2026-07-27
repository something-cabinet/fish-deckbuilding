import { describe, it, expect } from 'vitest';
import { resolveEffects } from '../Effects';
import type { CardEffect } from '../Effects';

const baseContext = {
  heroHp: 20,
  heroMaxHp: 30,
  coins: 3,
  handSize: 4,
  deckSize: 10,
  enemiesAlive: 1,
};

describe('resolveEffects', () => {
  it('should resolve a damage effect correctly', () => {
    const effects: CardEffect[] = [{ type: 'damage', value: 5 }];
    const result = resolveEffects(effects, baseContext);
    expect(result.damageToEnemy).toBe(5);
    expect(result.healHero).toBe(0);
    expect(result.drawCards).toBe(0);
    expect(result.coinsGained).toBe(0);
    expect(result.buffsToApply).toEqual([]);
    expect(result.debuffsToApply).toEqual([]);
  });

  it('should resolve a heal effect correctly', () => {
    const effects: CardEffect[] = [{ type: 'heal', value: 4 }];
    const result = resolveEffects(effects, baseContext);
    expect(result.healHero).toBe(4);
    expect(result.damageToEnemy).toBe(0);
  });

  it('should not overheal past max HP', () => {
    const effects: CardEffect[] = [{ type: 'heal', value: 99 }];
    const context = { ...baseContext, heroHp: 28, heroMaxHp: 30 };
    const result = resolveEffects(effects, context);
    expect(result.healHero).toBe(2); // Only need 2 to reach max
  });

  it('should resolve a draw effect correctly', () => {
    const effects: CardEffect[] = [{ type: 'draw', value: 2 }];
    const result = resolveEffects(effects, baseContext);
    expect(result.drawCards).toBe(2);
  });

  it('should resolve a gainCoins effect correctly', () => {
    const effects: CardEffect[] = [{ type: 'gainCoins', value: 3 }];
    const result = resolveEffects(effects, baseContext);
    expect(result.coinsGained).toBe(3);
  });

  it('should return empty result for empty effects list', () => {
    const effects: CardEffect[] = [];
    const result = resolveEffects(effects, baseContext);
    expect(result.damageToEnemy).toBe(0);
    expect(result.healHero).toBe(0);
    expect(result.drawCards).toBe(0);
    expect(result.coinsGained).toBe(0);
    expect(result.buffsToApply).toEqual([]);
    expect(result.debuffsToApply).toEqual([]);
  });

  it('should compound multiple effects correctly', () => {
    const effects: CardEffect[] = [
      { type: 'damage', value: 3 },
      { type: 'heal', value: 2 },
      { type: 'draw', value: 1 },
      { type: 'gainCoins', value: 2 },
    ];
    const result = resolveEffects(effects, baseContext);
    expect(result.damageToEnemy).toBe(3);
    expect(result.healHero).toBe(2);
    expect(result.drawCards).toBe(1);
    expect(result.coinsGained).toBe(2);
  });

  it('should handle multiple damage effects', () => {
    const effects: CardEffect[] = [
      { type: 'damage', value: 4 },
      { type: 'damage', value: 3 },
    ];
    const result = resolveEffects(effects, baseContext);
    expect(result.damageToEnemy).toBe(7);
  });

  it('should handle multiple draw effects', () => {
    const effects: CardEffect[] = [
      { type: 'draw', value: 1 },
      { type: 'draw', value: 2 },
    ];
    const result = resolveEffects(effects, baseContext);
    expect(result.drawCards).toBe(3);
  });
});
