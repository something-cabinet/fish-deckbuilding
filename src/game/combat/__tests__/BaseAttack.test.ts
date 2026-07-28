/**
 * Base Attack tests — hero base attack with counterattack, armor interaction, death.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { heroBaseAttack } from '../BaseAttack';
import { TurnPhase, CardType, MoveType } from '../CardTypes';
import type { CombatState, CombatHero, CombatEnemy, CombatCard } from '../CardTypes';
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
 * Create a state where hero is adjacent to an enemy.
 * Hero at (3,2), enemy at (4,2).
 */
function adjacentCombatState(overrides: {
  heroHp?: number;
  heroBaseAttack?: number;
  enemyHp?: number;
  enemyAttack?: number;
  enemyArmor?: number;
  heroArmor?: number;
} = {}): CombatState {
  const grid = createEmptyGrid(9, 5);

  const heroGridUnit: GridUnit = {
    id: 'hero_unit',
    type: 'hero',
    faction: 'player',
    position: { x: 3, y: 2 },
    moveType: GridMoveType.Normal,
    moveRange: 2,
    attackRange: 1,
    hasProvoke: false,
    hasActed: false,
    hasMoved: false,
    hasAttacked: false,
    isAlive: true,
  };

  const enemyGridUnit: GridUnit = {
    id: 'enemy_unit_e1',
    type: 'enemy',
    faction: 'enemy',
    position: { x: 4, y: 2 },
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
  g = placeUnit(g, enemyGridUnit);

  return {
    grid: g,
    hero: makeHero({
      hp: overrides.heroHp ?? 20,
      baseAttack: overrides.heroBaseAttack ?? 2,
      armor: overrides.heroArmor ?? 0,
    }),
    enemies: [makeEnemy({
      id: 'e1',
      hp: overrides.enemyHp ?? 10,
      attack: overrides.enemyAttack ?? 3,
      armor: overrides.enemyArmor ?? 0,
    })],
    hand: [],
    deck: [],
    discard: [],
    mana: 1,
    maxMana: 1,
    turnNumber: 1,
    turnPhase: TurnPhase.PlayerAction,
    canReplace: true,
    battleResult: 'ongoing',
    summons: [],
    summonIdCounter: 0,
    passives: [],
    seed: 42,
    cardInstanceCounter: 0,
  };
}

describe('BaseAttack', () => {
  describe('heroBaseAttack', () => {
    it('should deal base attack damage to enemy', () => {
      const state = adjacentCombatState({ heroBaseAttack: 2, enemyHp: 10 });
      const next = heroBaseAttack(state, 'e1');

      expect(next.enemies[0].hp).toBe(8); // 10 - 2
    });

    it('should counterattack the hero with enemy attack damage', () => {
      const state = adjacentCombatState({ heroHp: 20, enemyAttack: 3 });
      const next = heroBaseAttack(state, 'e1');

      expect(next.hero.hp).toBe(17); // 20 - 3
    });

    it('should kill enemy when HP reaches 0', () => {
      const state = adjacentCombatState({ heroBaseAttack: 10, enemyHp: 5 });
      const next = heroBaseAttack(state, 'e1');

      expect(next.enemies[0].hp).toBe(0);
      // Enemy removed from grid
      const enemyUnit = next.grid.units.get('enemy_unit_e1');
      expect(enemyUnit).toBeUndefined();
    });

    it('should kill hero when HP reaches 0 from counterattack', () => {
      const state = adjacentCombatState({ heroHp: 2, heroBaseAttack: 1, enemyAttack: 10 });
      const next = heroBaseAttack(state, 'e1');

      expect(next.hero.hp).toBe(0);
    });

    it('should absorb damage with hero armor', () => {
      const state = adjacentCombatState({
        heroHp: 20,
        heroBaseAttack: 1,
        heroArmor: 3,
        enemyAttack: 5,
      });
      const next = heroBaseAttack(state, 'e1');

      // Counterattack: 5 damage, armor absorbs 3, hero takes 2
      expect(next.hero.armor).toBe(0); // 3 - 3 = 0
      expect(next.hero.hp).toBe(18); // 20 - 2
    });

    it('should absorb damage with enemy armor', () => {
      const state = adjacentCombatState({
        heroBaseAttack: 5,
        enemyArmor: 3,
        enemyHp: 10,
      });
      const next = heroBaseAttack(state, 'e1');

      // Hero deals 5, armor absorbs 3, enemy takes 2 HP damage
      expect(next.enemies[0].armor).toBe(0);
      expect(next.enemies[0].hp).toBe(8); // 10 - 2
    });

    it('should return state unchanged if enemy is not adjacent', () => {
      // Default positions: hero at (1,2), enemy at (7,2) — not adjacent
      const grid = createEmptyGrid(9, 5);
      const heroGridUnit: GridUnit = {
        id: 'hero_unit',
        type: 'hero',
        faction: 'player',
        position: { x: 1, y: 2 },
        moveType: GridMoveType.Normal,
        moveRange: 2,
        attackRange: 1,
        hasProvoke: false,
        hasActed: false,
        hasMoved: false,
        hasAttacked: false,
        isAlive: true,
      };
      const enemyGridUnit: GridUnit = {
        id: 'enemy_unit_e1',
        type: 'enemy',
        faction: 'enemy',
        position: { x: 7, y: 2 },
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
      g = placeUnit(g, enemyGridUnit);

      const state: CombatState = {
        grid: g,
        hero: makeHero({ baseAttack: 2 }),
        enemies: [makeEnemy({ id: 'e1' })],
        hand: [],
        deck: [],
        discard: [],
        mana: 1,
        maxMana: 1,
        turnNumber: 1,
        turnPhase: TurnPhase.PlayerAction,
        canReplace: true,
        battleResult: 'ongoing',
        summons: [],
        summonIdCounter: 0,
        passives: [],
        seed: 42,
        cardInstanceCounter: 0,
      };

      const next = heroBaseAttack(state, 'e1');
      expect(next.enemies[0].hp).toBe(10); // unchanged
      expect(next.hero.hp).toBe(20); // unchanged
    });

    it('should return state unchanged for non-existent enemy', () => {
      const state = adjacentCombatState();
      const next = heroBaseAttack(state, 'nonexistent');
      expect(next.enemies[0].hp).toBe(10); // unchanged
    });
  });
});
