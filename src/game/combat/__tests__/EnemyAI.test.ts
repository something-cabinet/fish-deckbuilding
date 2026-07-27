import { describe, it, expect } from 'vitest';
import { computeEnemyActions } from '../EnemyAI';
import type { EnemyInstance, EnemyAction } from '../CardTypes';

function makeEnemy(overrides: Partial<EnemyInstance> & { id: string }): EnemyInstance {
  return {
    id: overrides.id,
    name: overrides.name ?? 'Test Enemy',
    hp: overrides.hp ?? 10,
    maxHp: overrides.maxHp ?? 10,
    attack: overrides.attack ?? 3,
    defense: overrides.defense ?? 1,
    intent: overrides.intent ?? 'attack',
    isBoss: overrides.isBoss ?? false,
  };
}

describe('EnemyAI', () => {
  describe('computeEnemyActions', () => {
    it('aggressive strategy: all enemies attack hero', () => {
      const enemies = [
        makeEnemy({ id: 'e1', attack: 2, defense: 1 }),
        makeEnemy({ id: 'e2', attack: 3, defense: 2 }),
      ];

      const actions = computeEnemyActions(enemies, 'aggressive');

      expect(actions).toHaveLength(2);
      expect(actions[0].type).toBe('attack');
      expect(actions[0].damage).toBe(2);
      expect(actions[0].target).toBe('hero');
      expect(actions[1].type).toBe('attack');
      expect(actions[1].damage).toBe(3);
      expect(actions[1].target).toBe('hero');
    });

    it('aggressive strategy: single enemy attacks', () => {
      const enemies = [makeEnemy({ id: 'e1', attack: 5 })];

      const actions = computeEnemyActions(enemies, 'aggressive');

      expect(actions).toHaveLength(1);
      expect(actions[0].type).toBe('attack');
      expect(actions[0].damage).toBe(5);
    });

    it('balanced strategy: roughly even split between attack and defend', () => {
      // With 4 enemies, balanced → even indices attack (0,2), odd defend (1,3)
      const enemies = [
        makeEnemy({ id: 'e1', attack: 2, defense: 1 }),
        makeEnemy({ id: 'e2', attack: 3, defense: 2 }),
        makeEnemy({ id: 'e3', attack: 4, defense: 3 }),
        makeEnemy({ id: 'e4', attack: 5, defense: 4 }),
      ];

      const actions = computeEnemyActions(enemies, 'balanced');

      expect(actions).toHaveLength(4);
      // Even indices (0, 2) attack
      expect(actions[0].type).toBe('attack');
      expect(actions[0].damage).toBe(2);
      expect(actions[2].type).toBe('attack');
      expect(actions[2].damage).toBe(4);
      // Odd indices (1, 3) defend
      expect(actions[1].type).toBe('defend');
      expect(actions[1].block).toBe(2);
      expect(actions[3].type).toBe('defend');
      expect(actions[3].block).toBe(4);
    });

    it('defensive strategy: most enemies defend, few attack', () => {
      // With 3 enemies, defensive → even indices defend (0,2), odd index attacks (1)
      const enemies = [
        makeEnemy({ id: 'e1', attack: 2, defense: 1 }),
        makeEnemy({ id: 'e2', attack: 3, defense: 2 }),
        makeEnemy({ id: 'e3', attack: 4, defense: 3 }),
      ];

      const actions = computeEnemyActions(enemies, 'defensive');

      expect(actions).toHaveLength(3);
      // Even indices (0, 2) defend
      expect(actions[0].type).toBe('defend');
      expect(actions[0].block).toBe(1);
      expect(actions[2].type).toBe('defend');
      expect(actions[2].block).toBe(3);
      // Odd index (1) attacks
      expect(actions[1].type).toBe('attack');
      expect(actions[1].damage).toBe(3);
    });

    it('defensive strategy: lone enemy defends', () => {
      const enemies = [makeEnemy({ id: 'e1', attack: 2, defense: 5 })];

      const actions = computeEnemyActions(enemies, 'defensive');

      expect(actions).toHaveLength(1);
      expect(actions[0].type).toBe('defend');
      expect(actions[0].block).toBe(5);
    });

    it('enemy with intent attack deals its attack damage to hero', () => {
      const enemies = [makeEnemy({ id: 'e1', attack: 7, intent: 'attack' })];

      const actions = computeEnemyActions(enemies, 'aggressive');

      expect(actions[0].type).toBe('attack');
      expect(actions[0].damage).toBe(7);
      expect(actions[0].target).toBe('hero');
    });

    it('enemy with intent defend gains block', () => {
      const enemies = [makeEnemy({ id: 'e1', attack: 3, defense: 4, intent: 'defend' })];

      const actions = computeEnemyActions(enemies, 'defensive');

      expect(actions[0].type).toBe('defend');
      expect(actions[0].block).toBe(4);
    });

    it('when all enemies are dead, no actions are generated', () => {
      const enemies = [
        makeEnemy({ id: 'e1', hp: 0, attack: 5 }),
        makeEnemy({ id: 'e2', hp: 0, attack: 3 }),
      ];

      const actions = computeEnemyActions(enemies, 'aggressive');

      expect(actions).toHaveLength(0);
    });

    it('dead enemies (hp <= 0) do not take actions', () => {
      const enemies = [
        makeEnemy({ id: 'e1', hp: 0, attack: 5 }),
        makeEnemy({ id: 'e2', hp: 10, attack: 3 }),
        makeEnemy({ id: 'e3', hp: -1, attack: 2 }),
      ];

      const actions = computeEnemyActions(enemies, 'aggressive');

      expect(actions).toHaveLength(1);
      expect(actions[0].enemyIndex).toBe(1);
      expect(actions[0].damage).toBe(3);
    });

    it('empty enemies array produces no actions', () => {
      const actions = computeEnemyActions([], 'aggressive');
      expect(actions).toHaveLength(0);
    });

    it('mixed alive and dead enemies: only alive take actions', () => {
      const enemies = [
        makeEnemy({ id: 'e1', hp: 0, attack: 5, defense: 2 }),
        makeEnemy({ id: 'e2', hp: 8, attack: 3, defense: 1 }),
        makeEnemy({ id: 'e3', hp: 12, attack: 2, defense: 3 }),
      ];

      const actions = computeEnemyActions(enemies, 'balanced');

      // Only e2 (index 1) and e3 (index 2) are alive
      // Balanced: even indices attack → index 2 attacks, index 1 defends
      expect(actions).toHaveLength(2);
      expect(actions[0].enemyIndex).toBe(1);
      expect(actions[0].type).toBe('defend');
      expect(actions[0].block).toBe(1);
      expect(actions[1].enemyIndex).toBe(2);
      expect(actions[1].type).toBe('attack');
      expect(actions[1].damage).toBe(2);
    });

    it('EnemyAction has correct structure for attack', () => {
      const enemies = [makeEnemy({ id: 'e1', attack: 4 })];
      const actions = computeEnemyActions(enemies, 'aggressive');

      const action: EnemyAction = actions[0];
      expect(action).toHaveProperty('enemyIndex', 0);
      expect(action).toHaveProperty('type', 'attack');
      expect(action).toHaveProperty('damage', 4);
      expect(action).toHaveProperty('target', 'hero');
    });

    it('EnemyAction has correct structure for defend', () => {
      const enemies = [makeEnemy({ id: 'e1', defense: 3 })];
      const actions = computeEnemyActions(enemies, 'defensive');

      const action: EnemyAction = actions[0];
      expect(action).toHaveProperty('enemyIndex', 0);
      expect(action).toHaveProperty('type', 'defend');
      expect(action).toHaveProperty('block', 3);
      expect(action).toHaveProperty('target', 'hero');
    });
  });
});
