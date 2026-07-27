export interface EnemyDef {
  id: string;
  name: string;
  hp: number;
  attack: number;
  color: string;
  shape: 'circle' | 'square' | 'triangle';
  description: string;
}

export const ENEMY_DATA: Record<string, EnemyDef> = {
  small_crab: {
    id: 'small_crab',
    name: 'Small Crab',
    hp: 10,
    attack: 3,
    color: '#e85d4e',
    shape: 'square',
    description: 'A crusty bottom-dweller.',
  },
  jelly_drifter: {
    id: 'jelly_drifter',
    name: 'Jelly Drifter',
    hp: 8,
    attack: 2,
    color: '#a855f7',
    shape: 'circle',
    description: 'Floats menacingly.',
  },
  hammerhead: {
    id: 'hammerhead',
    name: 'Hammerhead',
    hp: 25,
    attack: 6,
    color: '#e85d4e',
    shape: 'triangle',
    description: 'A heavy hitter from the deep.',
  },
  collector_eel: {
    id: 'collector_eel',
    name: 'Collector Eel',
    hp: 18,
    attack: 4,
    color: '#f4c430',
    shape: 'circle',
    description: 'Collects debts with shocking efficiency.',
  },
  boss_leviathan: {
    id: 'boss_leviathan',
    name: 'Debt Leviathan',
    hp: 80,
    attack: 10,
    color: '#ef4444',
    shape: 'square',
    description: 'The final creditor. All debts come due.',
  },
};

export function getEnemy(id: string): EnemyDef | undefined {
  return ENEMY_DATA[id];
}
