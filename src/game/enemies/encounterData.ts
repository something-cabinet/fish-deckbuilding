import type { EnemyInstance, AIStrategy } from '../combat/CardTypes';

export interface EncounterDef {
  id: string;
  name: string;
  enemies: EnemyInstance[];    // Flat array of enemies
  aiStrategy: AIStrategy;
  rewardGold: number;
  rewardCards?: string[];      // Card rewards on victory
}

function makeEnemy(partial: Partial<EnemyInstance> & { id: string; name: string; hp: number; maxHp: number }): EnemyInstance {
  return {
    id: partial.id,
    name: partial.name,
    hp: partial.hp,
    maxHp: partial.maxHp,
    attack: partial.attack ?? 1,
    defense: partial.defense ?? 0,
    intent: partial.intent ?? 'attack',
    isBoss: partial.isBoss ?? false,
  };
}

const basicCrabCrew: EncounterDef = {
  id: 'crab_crew',
  name: 'Crab Crew',
  enemies: [
    makeEnemy({ id: 'enemy_crab1', name: 'Small Crab', hp: 6, maxHp: 6, attack: 2, defense: 1 }),
    makeEnemy({ id: 'enemy_crab2', name: 'Small Crab', hp: 4, maxHp: 4, attack: 1, defense: 1 }),
  ],
  aiStrategy: 'balanced',
  rewardGold: 10,
};

const jellyDrifter: EncounterDef = {
  id: 'jelly_drifter',
  name: 'Jelly Drifter',
  enemies: [
    makeEnemy({ id: 'enemy_jelly1', name: 'Jelly Drifter', hp: 8, maxHp: 8, attack: 3, defense: 0, intent: 'attack' }),
  ],
  aiStrategy: 'aggressive',
  rewardGold: 15,
  rewardCards: ['fin_slash', 'bubble_shield', 'ink_cloud'],
};

const pufferPatrol: EncounterDef = {
  id: 'puffer_patrol',
  name: 'Puffer Patrol',
  enemies: [
    makeEnemy({ id: 'enemy_puffer1', name: 'Puffer Fish', hp: 10, maxHp: 10, attack: 1, defense: 3, intent: 'defend' }),
    makeEnemy({ id: 'enemy_puffer2', name: 'Puffer Fish', hp: 8, maxHp: 8, attack: 4, defense: 1, intent: 'attack' }),
  ],
  aiStrategy: 'defensive',
  rewardGold: 20,
};

const collectorEel: EncounterDef = {
  id: 'collector_eel',
  name: 'Collector Eel',
  enemies: [
    makeEnemy({ id: 'enemy_eel', name: 'Collector Eel', hp: 18, maxHp: 18, attack: 5, defense: 2, intent: 'attack' }),
    makeEnemy({ id: 'enemy_eel_minion1', name: 'Small Crab', hp: 5, maxHp: 5, attack: 2, defense: 1, intent: 'attack' }),
    makeEnemy({ id: 'enemy_eel_minion2', name: 'Small Crab', hp: 5, maxHp: 5, attack: 2, defense: 1, intent: 'attack' }),
  ],
  aiStrategy: 'balanced',
  rewardGold: 30,
};

const hammerheadEncounter: EncounterDef = {
  id: 'hammerhead',
  name: 'Hammerhead Enforcer',
  enemies: [
    makeEnemy({ id: 'enemy_hammer1', name: 'Hammerhead Enforcer', hp: 25, maxHp: 25, attack: 7, defense: 2, intent: 'attack', isBoss: true }),
  ],
  aiStrategy: 'aggressive',
  rewardGold: 40,
};

const bossLeviathan: EncounterDef = {
  id: 'boss_leviathan',
  name: 'Debt Leviathan',
  enemies: [
    makeEnemy({ id: 'enemy_leviathan', name: 'Debt Leviathan', hp: 80, maxHp: 80, attack: 10, defense: 4, intent: 'attack', isBoss: true }),
    makeEnemy({ id: 'enemy_leviathan_tentacle1', name: 'Leviathan Tentacle', hp: 12, maxHp: 12, attack: 5, defense: 1, intent: 'attack' }),
    makeEnemy({ id: 'enemy_leviathan_tentacle2', name: 'Leviathan Tentacle', hp: 12, maxHp: 12, attack: 5, defense: 1, intent: 'attack' }),
  ],
  aiStrategy: 'balanced',
  rewardGold: 100,
};

export const ENCOUNTER_DATA: Record<string, EncounterDef> = {
  crab_crew: basicCrabCrew,
  jelly_drifter: jellyDrifter,
  puffer_patrol: pufferPatrol,
  collector_eel: collectorEel,
  hammerhead: hammerheadEncounter,
  boss_leviathan: bossLeviathan,
};

/** Encounters by difficulty tier */
export const ENCOUNTERS_BY_TIER: Record<string, string[]> = {
  easy: ['crab_crew', 'jelly_drifter'],
  medium: ['puffer_patrol', 'collector_eel'],
  hard: ['hammerhead'],
  boss: ['boss_leviathan'],
};

export function getEncounter(id: string): EncounterDef | undefined {
  return ENCOUNTER_DATA[id];
}

/**
 * Map node types to encounter tiers.
 * - 'combat' → 'easy'
 * - 'elite'  → 'medium' (or 'hard' if act >= 2)
 * - 'boss'   → 'boss'
 */
export function mapNodeTypeToTier(nodeType: string, act: number = 1): string {
  switch (nodeType) {
    case 'combat':
      return 'easy';
    case 'elite':
      return act >= 2 ? 'hard' : 'medium';
    case 'boss':
      return 'boss';
    default:
      return 'easy';
  }
}

export function getRandomEncounter(tier: string, act: number = 1): EncounterDef {
  const mappedTier = mapNodeTypeToTier(tier, act);
  const pool = ENCOUNTERS_BY_TIER[mappedTier] || ENCOUNTERS_BY_TIER.easy;
  const id = pool[Math.floor(Math.random() * pool.length)];
  return ENCOUNTER_DATA[id];
}
