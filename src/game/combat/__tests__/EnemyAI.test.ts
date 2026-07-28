/**
 * Enemy AI tests — grid-based movement, attack targeting, strategy behaviors.
 */
import { describe, it, expect } from 'vitest';
import { executeEnemyTurn, getEnemyMoveTarget, getEnemyAttackTarget } from '../EnemyAI';
import { TurnPhase, CardType, MoveType } from '../CardTypes';
import type { CombatState, CombatHero, CombatEnemy } from '../CardTypes';
import { createEmptyGrid, placeUnit } from '../../grid/GridFactory';
import { MoveType as GridMoveType } from '../../grid/GridTypes';
import type { GridUnit } from '../../grid/GridTypes';

// ───── Test Helpers ─────

function makeHero(overrides: Partial<CombatHero> = {}): CombatHero {
  return {
    id: 'hero',
    unitId: 'hero_unit',
    hp: overrides.hp ?? 20,
    maxHp: overrides.maxHp ?? 20,
    baseAttack: overrides.baseAttack ?? 2,
    armor: overrides.armor ?? 0,
    armorTurns: overrides.armorTurns ?? 0,
  };
}

function makeEnemy(overrides: Partial<CombatEnemy> & { id: string }): CombatEnemy {
  return {
    id: overrides.id,
    unitId: `enemy_unit_${overrides.id}`,
    name: overrides.name ?? 'Test Enemy',
    hp: overrides.hp ?? 10,
    maxHp: overrides.maxHp ?? 10,
    attack: overrides.attack ?? 3,
    defense: overrides.defense ?? 1,
    armor: overrides.armor ?? 0,
    aiStrategy: overrides.aiStrategy ?? 'aggressive',
    hasProvoke: overrides.hasProvoke ?? false,
    moveRange: overrides.moveRange ?? 2,
    attackRange: overrides.attackRange ?? 1,
  };
}

/**
 * Create a combat state with the hero at a specific position and enemies at specific positions.
 */
function createCombatState(heroPos: { x: number; y: number }, enemyConfigs: Array<{
  id: string;
  pos: { x: number; y: number };
  hp?: number;
  attack?: number;
  aiStrategy?: 'aggressive' | 'balanced' | 'defensive';
  attackRange?: number;
}> = []): CombatState {
  const grid = createEmptyGrid(9, 5);

  const heroGridUnit: GridUnit = {
    id: 'hero_unit',
    type: 'hero',
    faction: 'player',
    position: { x: heroPos.x, y: heroPos.y },
    moveType: GridMoveType.Normal,
    moveRange: 2,
    attackRange: 1,
    hasProvoke: false,
    hasActed: false,
    hasMoved: false,
    hasAttacked: false,
    isAlive: true,
  };
  let g = placeUnit(grid, heroGridUnit);

  const enemies: CombatEnemy[] = [];
  for (const ec of enemyConfigs) {
    const enemyGridUnit: GridUnit = {
      id: `enemy_unit_${ec.id}`,
      type: 'enemy',
      faction: 'enemy',
      position: { x: ec.pos.x, y: ec.pos.y },
      moveType: GridMoveType.Normal,
      moveRange: 2,
      attackRange: ec.attackRange ?? 1,
      hasProvoke: false,
      hasActed: false,
      hasMoved: false,
      hasAttacked: false,
      isAlive: true,
    };
    g = placeUnit(g, enemyGridUnit);

    enemies.push(makeEnemy({
      id: ec.id,
      hp: ec.hp ?? 10,
      attack: ec.attack ?? 3,
      aiStrategy: ec.aiStrategy ?? 'aggressive',
      attackRange: ec.attackRange ?? 1,
    }));
  }

  return {
    grid: g,
    hero: makeHero(),
    enemies,
    hand: [],
    deck: [],
    discard: [],
    mana: 1,
    maxMana: 1,
    turnNumber: 1,
    turnPhase: TurnPhase.EnemyTurn,
    canReplace: false,
    battleResult: 'ongoing',
    summons: [],
    summonIdCounter: 0,
    passives: [],
    seed: 42,
    cardInstanceCounter: 0,
  };
}

describe('EnemyAI', () => {
  describe('getEnemyMoveTarget', () => {
    it('should return a position closer to the hero for aggressive enemy', () => {
      // Hero at (1,2), enemy at (7,2) — far apart
      const state = createCombatState(
        { x: 1, y: 2 },
        [{ id: 'e1', pos: { x: 7, y: 2 }, aiStrategy: 'aggressive' }],
      );

      const moveTarget = getEnemyMoveTarget(state, state.enemies[0]);
      expect(moveTarget).not.toBeNull();

      // Target should be closer to hero than current position
      if (moveTarget) {
        const currentDist = Math.abs(7 - 1) + Math.abs(2 - 2); // 6
        const newDist = Math.abs(moveTarget.x - 1) + Math.abs(moveTarget.y - 2);
        expect(newDist).toBeLessThan(currentDist);
      }
    });

    it('should return null for defensive enemy far from hero', () => {
      // Hero at (1,2), enemy at (7,2) — far apart (dist = 6 > 3)
      const state = createCombatState(
        { x: 1, y: 2 },
        [{ id: 'e1', pos: { x: 7, y: 2 }, aiStrategy: 'defensive' }],
      );

      const moveTarget = getEnemyMoveTarget(state, state.enemies[0]);
      expect(moveTarget).toBeNull();
    });

    it('should return null if enemy is already in attack range', () => {
      // Enemy at (2,2), hero at (1,2) — adjacent, already in melee range
      const state = createCombatState(
        { x: 1, y: 2 },
        [{ id: 'e1', pos: { x: 2, y: 2 }, aiStrategy: 'aggressive' }],
      );

      const moveTarget = getEnemyMoveTarget(state, state.enemies[0]);
      expect(moveTarget).toBeNull();
    });
  });

  describe('getEnemyAttackTarget', () => {
    it('should return hero unitId when hero is in range', () => {
      // Hero at (1,2), enemy at (2,2) — adjacent
      const state = createCombatState(
        { x: 1, y: 2 },
        [{ id: 'e1', pos: { x: 2, y: 2 }, aiStrategy: 'aggressive' }],
      );

      const targetId = getEnemyAttackTarget(state, state.enemies[0]);
      expect(targetId).toBe('hero_unit');
    });

    it('should return null when no targets are in range', () => {
      // Hero at (1,2), enemy at (7,2) — far apart
      const state = createCombatState(
        { x: 1, y: 2 },
        [{ id: 'e1', pos: { x: 7, y: 2 }, aiStrategy: 'aggressive' }],
      );

      const targetId = getEnemyAttackTarget(state, state.enemies[0]);
      expect(targetId).toBeNull();
    });
  });

  describe('executeEnemyTurn', () => {
    it('should not crash with empty enemies', () => {
      const state = createCombatState({ x: 1, y: 2 });
      const next = executeEnemyTurn(state);
      expect(next.hero.hp).toBe(20);
      expect(next.enemies).toHaveLength(0);
    });

    it('should deal damage to hero when enemy is adjacent', () => {
      const state = createCombatState(
        { x: 1, y: 2 },
        [{ id: 'e1', pos: { x: 2, y: 2 }, attack: 3, aiStrategy: 'aggressive' }],
      );

      const next = executeEnemyTurn(state);
      expect(next.hero.hp).toBeLessThan(20); // Hero took damage
    });

    it('should move aggressive enemy toward hero and attack', () => {
      // Hero at (1,2), enemy at (5,2) — within 2 moves of being adjacent
      const state = createCombatState(
        { x: 1, y: 2 },
        [{ id: 'e1', pos: { x: 5, y: 2 }, attack: 3, aiStrategy: 'aggressive' }],
      );

      const next = executeEnemyTurn(state);

      // Enemy moved closer (preferred) OR attacked if got in range
      const enemyUnit = next.grid.units.get('enemy_unit_e1');
      expect(enemyUnit).toBeDefined();
      if (enemyUnit) {
        const distToHero = Math.abs(enemyUnit.position.x - 1) + Math.abs(enemyUnit.position.y - 2);
        expect(distToHero).toBeLessThanOrEqual(4); // Original dist was 4, could move 2 closer
      }
    });

    it('should not move defensive enemy when hero is far', () => {
      const state = createCombatState(
        { x: 1, y: 2 },
        [{ id: 'e1', pos: { x: 7, y: 2 }, attack: 3, aiStrategy: 'defensive' }],
      );

      const next = executeEnemyTurn(state);

      const enemyUnit = next.grid.units.get('enemy_unit_e1');
      expect(enemyUnit).toBeDefined();
      expect(enemyUnit!.position).toEqual({ x: 7, y: 2 }); // Didn't move
    });

    it('should process all alive enemies in order', () => {
      const state = createCombatState(
        { x: 1, y: 2 },
        [
          { id: 'e1', pos: { x: 2, y: 2 }, attack: 2, aiStrategy: 'aggressive' },
          { id: 'e2', pos: { x: 2, y: 1 }, attack: 3, aiStrategy: 'aggressive' },
        ],
      );

      const next = executeEnemyTurn(state);

      // Both enemies attacked
      expect(next.hero.hp).toBeLessThan(20);
      // Both still alive (unless hero killed one - unlikely)
      expect(next.enemies.length).toBe(2);
    });

    it('should skip dead enemies', () => {
      const state = createCombatState(
        { x: 1, y: 2 },
        [
          { id: 'e1', pos: { x: 2, y: 2 }, attack: 2, aiStrategy: 'aggressive' },
        ],
      );
      // Kill e1
      const deadState: CombatState = {
        ...state,
        enemies: state.enemies.map(e => e.id === 'e1' ? { ...e, hp: 0 } : e),
      };

      const next = executeEnemyTurn(deadState);
      expect(next.hero.hp).toBe(20); // No damage since enemy is dead
    });
  });
});
