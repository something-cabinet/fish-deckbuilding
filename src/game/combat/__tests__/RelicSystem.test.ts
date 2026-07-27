import { describe, it, expect } from 'vitest';
import { resolveRelicTrigger } from '../RelicSystem';
import type { RelicDef } from '../RelicSystem';

function makeRelic(id: string, trigger: string, effectType: string, value: number): RelicDef {
  return {
    id,
    name: id.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
    description: 'A test relic.',
    color: '#fff',
    rarity: 'common' as const,
    effects: [{ trigger: trigger as any, effect: effectType as any, value }],
  };
}

function makeChanceRelic(id: string, trigger: string, effectType: string, value: number, chance: number): RelicDef {
  return {
    id,
    name: id.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
    description: 'A chance relic.',
    color: '#fff',
    rarity: 'common' as const,
    effects: [{ trigger: trigger as any, effect: effectType as any, value, chance }],
  };
}

describe('resolveRelicTrigger', () => {
  it('should return no effects when no relics are owned', () => {
    const effects = resolveRelicTrigger('onCombatStart', [], 1);
    expect(effects).toEqual([]);
  });

  it('should fire relic effect on onCombatStart trigger', () => {
    const relic = makeRelic('coral_ring', 'onCombatStart', 'heal', 5);
    const effects = resolveRelicTrigger('onCombatStart', [relic], 1);
    expect(effects).toHaveLength(1);
    expect(effects[0].type).toBe('heal');
    expect(effects[0].value).toBe(5);
  });

  it('should fire relic effect on onTurnStart trigger', () => {
    const relic = makeRelic('old_coin', 'onTurnStart', 'gainCoins', 1);
    const effects = resolveRelicTrigger('onTurnStart', [relic], 1);
    expect(effects).toHaveLength(1);
    expect(effects[0].type).toBe('gainCoins');
    expect(effects[0].value).toBe(1);
  });

  it('should fire relic effect on onCardPlayed trigger', () => {
    const relic = makeChanceRelic('pearl_necklace', 'onCardPlayed', 'draw', 1, 100);
    const effects = resolveRelicTrigger('onCardPlayed', [relic], 100);
    expect(effects).toHaveLength(1);
    expect(effects[0].type).toBe('draw');
    expect(effects[0].value).toBe(1);
  });

  it('should not fire chance-based relic when roll is above chance', () => {
    const relic = makeChanceRelic('pearl_necklace', 'onCardPlayed', 'draw', 1, 10);
    const effects = resolveRelicTrigger('onCardPlayed', [relic], 95);
    expect(effects).toHaveLength(0);
  });

  it('should stack effects from multiple relics', () => {
    const relic1 = makeRelic('old_coin', 'onTurnStart', 'gainCoins', 1);
    const relic2 = makeRelic('coral_ring', 'onTurnStart', 'heal', 2);
    const effects = resolveRelicTrigger('onTurnStart', [relic1, relic2], 1);
    expect(effects).toHaveLength(2);
    expect(effects.map(e => e.type)).toContain('gainCoins');
    expect(effects.map(e => e.type)).toContain('heal');
  });

  it('should only fire effects matching the given trigger', () => {
    const relic = makeRelic('old_coin', 'onTurnStart', 'gainCoins', 1);
    const effects = resolveRelicTrigger('onCombatStart', [relic], 1);
    expect(effects).toHaveLength(0);
  });

  it('should handle multiple relics with same trigger and multiple effects per relic', () => {
    const relic1 = makeRelic('test1', 'onTurnStart', 'gainCoins', 1);
    const relic2: RelicDef = {
      id: 'test2',
      name: 'Test Relic 2',
      description: '',
      color: '#fff',
      rarity: 'common',
      effects: [
        { trigger: 'onTurnStart', effect: 'heal', value: 2 },
        { trigger: 'onTurnStart', effect: 'draw', value: 1 },
      ],
    };
    const effects = resolveRelicTrigger('onTurnStart', [relic1, relic2], 1);
    expect(effects).toHaveLength(3);
  });
});
