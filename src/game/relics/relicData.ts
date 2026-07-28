/**
 * Relic data definitions.
 *
 * RelicDef and related types are defined inline (the old RelicSystem.ts has been removed).
 */

export type RelicTrigger =
  | 'onTurnStart'
  | 'onTurnEnd'
  | 'onCombatStart'
  | 'onCardPlayed'
  | 'onDamageDealt'
  | 'onDamageTaken'
  | 'onEnemyKilled';

export interface RelicEffectDef {
  trigger: RelicTrigger;
  effect: string;
  value: number;
  chance?: number;
}

export interface RelicDef {
  id: string;
  name: string;
  description: string;
  effects: RelicEffectDef[];
  color: string;
  rarity: 'common' | 'uncommon' | 'rare';
}

export type { RelicDef as RelicDefAlias };

export const RELIC_DATA: Record<string, RelicDef> = {
  old_coin: {
    id: 'old_coin',
    name: 'Old Coin',
    description: 'Gain 1 coin at the start of each turn.',
    color: '#f4c430',
    rarity: 'common',
    effects: [{ trigger: 'onTurnStart', effect: 'gainCoins', value: 1 }],
  },
  coral_ring: {
    id: 'coral_ring',
    name: 'Coral Ring',
    description: 'Heal 5 HP at the start of each combat.',
    color: '#e85d4e',
    rarity: 'common',
    effects: [{ trigger: 'onCombatStart', effect: 'heal', value: 5 }],
  },
  pearl_necklace: {
    id: 'pearl_necklace',
    name: 'Pearl Necklace',
    description: '10% chance to draw a card when you play a card.',
    color: '#f0e6d3',
    rarity: 'uncommon',
    effects: [{ trigger: 'onCardPlayed', effect: 'draw', value: 1, chance: 10 }],
  },
  golden_scales: {
    id: 'golden_scales',
    name: 'Golden Scales',
    description: 'Reduce all incoming damage by 1.',
    color: '#f4c430',
    rarity: 'rare',
    effects: [{ trigger: 'onDamageTaken', effect: 'heal', value: 1 }],
  },
  debt_contract: {
    id: 'debt_contract',
    name: 'Debt Contract',
    description: 'Gain 3 coins whenever you defeat an enemy.',
    color: '#e85d4e',
    rarity: 'uncommon',
    effects: [{ trigger: 'onEnemyKilled', effect: 'gainCoins', value: 3 }],
  },
};

export function getRelic(id: string): RelicDef | undefined {
  return RELIC_DATA[id];
}
