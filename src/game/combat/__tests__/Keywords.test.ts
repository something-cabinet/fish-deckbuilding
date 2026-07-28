import { describe, it, expect } from 'vitest';
import { resolveKeywords } from '../Keywords';
import type { CardDef } from '../CardTypes';

const baseContext = {
  heroHp: 20,
  heroMaxHp: 30,
  coins: 3,
  creditLimit: 5,
  handSize: 4,
};

function makeCard(overrides: Partial<CardDef> & { id: string }): CardDef {
  return {
    name: 'Test Card',
    type: 'action' as const,
    cost: 1,
    coinValue: 1,
    attack: 3,
    defense: 0,
    description: 'A test card.',
    color: '#fff',
    ...overrides,
  };
}

describe('resolveKeywords', () => {
  it('should return empty bonuses for a card with no keywords', () => {
    const card = makeCard({ id: 'test_no_kw', attack: 3 });
    const result = resolveKeywords(card, { ...baseContext, card });

    expect(result.bonusDamage).toBeUndefined();
    expect(result.healAmount).toBeUndefined();
    expect(result.pierce).toBeUndefined();
    expect(result.taunt).toBeUndefined();
    expect(result.coinBonus).toBeUndefined();
    expect(result.drawBonus).toBeUndefined();
  });

  it('should calculate lifesteal heal as half damage rounded up', () => {
    // attack 5 → ceil(5/2) = 3
    const card = makeCard({ id: 'test_ls', attack: 5, keywords: ['lifesteal'] });
    const result = resolveKeywords(card, { ...baseContext, card });
    expect(result.healAmount).toBe(3);
  });

  it('should calculate lifesteal for odd attack values', () => {
    // attack 3 → ceil(3/2) = 2
    const card = makeCard({ id: 'test_ls_odd', attack: 3, keywords: ['lifesteal'] });
    const result = resolveKeywords(card, { ...baseContext, card });
    expect(result.healAmount).toBe(2);
  });

  it('should set pierce flag to true', () => {
    const card = makeCard({ id: 'test_pierce', attack: 3, keywords: ['pierce'] });
    const result = resolveKeywords(card, { ...baseContext, card });
    expect(result.pierce).toBe(true);
  });

  it('should add bonus damage equal to base attack for double_strike', () => {
    const card = makeCard({ id: 'test_ds', attack: 4, keywords: ['double_strike'] });
    const result = resolveKeywords(card, { ...baseContext, card });
    expect(result.bonusDamage).toBe(4);
  });

  it('should stack lifesteal and double_strike correctly', () => {
    // attack 3 → double → 6 total → lifesteal heal = ceil(6/2) = 3
    const card = makeCard({ id: 'test_stack', attack: 3, keywords: ['lifesteal', 'double_strike'] });
    const result = resolveKeywords(card, { ...baseContext, card });
    expect(result.bonusDamage).toBe(3);
    expect(result.healAmount).toBe(3);
  });

  it('should stack lifesteal, double_strike, and pierce', () => {
    const card = makeCard({ id: 'test_stack3', attack: 5, keywords: ['lifesteal', 'double_strike', 'pierce'] });
    const result = resolveKeywords(card, { ...baseContext, card });
    expect(result.bonusDamage).toBe(5);
    expect(result.healAmount).toBe(5); // ceil(10/2)
    expect(result.pierce).toBe(true);
  });

  it('should handle rush and overdraft keywords without errors', () => {
    const card = makeCard({ id: 'test_ro', attack: 2, keywords: ['rush', 'overdraft'] });
    const result = resolveKeywords(card, { ...baseContext, card });
    // These keywords have no direct numerical effect
    expect(result.bonusDamage).toBeUndefined();
    expect(result.healAmount).toBeUndefined();
  });

  it('should set taunt flag to true', () => {
    const card = makeCard({ id: 'test_taunt', attack: 0, keywords: ['taunt'] });
    const result = resolveKeywords(card, { ...baseContext, card });
    expect(result.taunt).toBe(true);
  });
});
