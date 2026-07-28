/**
 * Card Effects tests — attack, armor, skill, summon, passive, AoE.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  resolveAttackCard,
  resolveArmorCard,
  resolveSkillCard,
  resolveSummonCard,
  resolvePassiveCard,
} from '../CardEffects';
import { TurnPhase, CardType, MoveType } from '../CardTypes';
import type { CombatState, CombatCard, CombatHero, CombatEnemy, CardDefinition } from '../CardTypes';
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

function baseGrid(): ReturnType<typeof createEmptyGrid> {
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
  return placeUnit(grid, heroGridUnit);
}

function baseState(overrides: Partial<CombatState> = {}): CombatState {
  const grid = baseGrid();
  const hero = makeHero();
  const enemies = [makeEnemy({ id: 'e1' })];

  // Place enemy on grid
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
  const gridWithEnemy = placeUnit(grid, enemyGridUnit);

  return {
    grid: gridWithEnemy,
    hero,
    enemies,
    hand: [],
    deck: [],
    discard: [],
    mana: 5,
    maxMana: 5,
    turnNumber: 1,
    turnPhase: TurnPhase.PlayerAction,
    canReplace: true,
    battleResult: 'ongoing',
    summons: [],
    summonIdCounter: 0,
    passives: [],
    seed: 42,
    cardInstanceCounter: 0,
    ...overrides,
  };
}

function makeCard(def: CardDefinition): CombatCard {
  return {
    id: def.id,
    instanceId: `${def.id}_test`,
    definition: { ...def },
  };
}

describe('CardEffects', () => {
  describe('resolveAttackCard', () => {
    it('should deal damage to the target enemy', () => {
      const state = baseState();
      const card = makeCard({
        id: 'attack', name: 'Attack', type: CardType.Attack,
        manaCost: 1, damage: 3, description: '',
      });
      const targetPos = { x: 7, y: 2 }; // enemy position

      const next = resolveAttackCard(state, card, targetPos);

      expect(next.enemies[0].hp).toBe(7); // 10 - 3
      expect(next.hero.hp).toBe(20); // hero unaffected
    });

    it('should kill an enemy when HP reaches 0', () => {
      const state = baseState({ enemies: [makeEnemy({ id: 'e1', hp: 2 })] });
      const card = makeCard({
        id: 'attack', name: 'Attack', type: CardType.Attack,
        manaCost: 1, damage: 3, description: '',
      });
      const targetPos = { x: 7, y: 2 };

      const next = resolveAttackCard(state, card, targetPos);

      expect(next.enemies[0].hp).toBe(0);
    });

    it('should not damage hero or other non-target enemies', () => {
      const state = baseState({
        enemies: [
          makeEnemy({ id: 'e1', hp: 10 }),
          makeEnemy({ id: 'e2', hp: 10 }),
        ],
      });
      // Place e2 on grid
      const e2GridUnit: GridUnit = {
        id: 'enemy_unit_e2',
        type: 'enemy',
        faction: 'enemy',
        position: { x: 6, y: 1 },
        moveType: GridMoveType.Normal,
        moveRange: 2,
        attackRange: 1,
        hasProvoke: false,
        hasActed: false,
        hasMoved: false,
        hasAttacked: false,
        isAlive: true,
      };
      const gridWithE2 = placeUnit(state.grid, e2GridUnit);
      const stateWithGrid = { ...state, grid: gridWithE2 };

      const card = makeCard({
        id: 'attack', name: 'Attack', type: CardType.Attack,
        manaCost: 1, damage: 5, description: '',
      });
      const targetPos = { x: 7, y: 2 };

      const next = resolveAttackCard(stateWithGrid, card, targetPos);

      expect(next.enemies[0].hp).toBe(5); // e1 damaged
      expect(next.enemies[1].hp).toBe(10); // e2 not damaged
    });
  });

  describe('AoE attack', () => {
    it('should damage multiple enemies within radius', () => {
      const state = baseState({
        enemies: [
          makeEnemy({ id: 'e1', hp: 10 }),
          makeEnemy({ id: 'e2', hp: 10 }),
        ],
      });
      // Place e2 adjacent to e1
      const e2GridUnit: GridUnit = {
        id: 'enemy_unit_e2',
        type: 'enemy',
        faction: 'enemy',
        position: { x: 7, y: 1 }, // adjacent to e1 at (7,2)
        moveType: GridMoveType.Normal,
        moveRange: 2,
        attackRange: 1,
        hasProvoke: false,
        hasActed: false,
        hasMoved: false,
        hasAttacked: false,
        isAlive: true,
      };
      const gridWithE2 = placeUnit(state.grid, e2GridUnit);
      const stateWithGrid = { ...state, grid: gridWithE2 };

      const card = makeCard({
        id: 'aoe', name: 'AoE', type: CardType.Attack,
        manaCost: 3, damage: 4, isAoE: true, aoeRadius: 1, description: '',
      });
      const targetPos = { x: 7, y: 2 };

      const next = resolveAttackCard(stateWithGrid, card, targetPos);

      expect(next.enemies[0].hp).toBe(6); // 10 - 4
      expect(next.enemies[1].hp).toBe(6); // 10 - 4 (within radius)
    });

    it('should not damage enemies outside the AoE radius', () => {
      const state = baseState({
        enemies: [
          makeEnemy({ id: 'e1', hp: 10 }),
          makeEnemy({ id: 'e2', hp: 10 }),
        ],
      });
      const e2GridUnit: GridUnit = {
        id: 'enemy_unit_e2',
        type: 'enemy',
        faction: 'enemy',
        position: { x: 4, y: 2 }, // far from e1 at (7,2)
        moveType: GridMoveType.Normal,
        moveRange: 2,
        attackRange: 1,
        hasProvoke: false,
        hasActed: false,
        hasMoved: false,
        hasAttacked: false,
        isAlive: true,
      };
      const gridWithE2 = placeUnit(state.grid, e2GridUnit);
      const stateWithGrid = { ...state, grid: gridWithE2 };

      const card = makeCard({
        id: 'aoe', name: 'AoE', type: CardType.Attack,
        manaCost: 3, damage: 4, isAoE: true, aoeRadius: 1, description: '',
      });
      const targetPos = { x: 7, y: 2 };

      const next = resolveAttackCard(stateWithGrid, card, targetPos);

      expect(next.enemies[0].hp).toBe(6); // e1 in radius
      expect(next.enemies[1].hp).toBe(10); // e2 outside radius
    });
  });

  describe('Armor card', () => {
    it('should add armor to hero', () => {
      const state = baseState();
      const card = makeCard({
        id: 'armor', name: 'Armor', type: CardType.Armor,
        manaCost: 1, armorAmount: 3, description: '',
      });

      const next = resolveArmorCard(state, card);

      expect(next.hero.armor).toBe(3);
      expect(next.hero.armorTurns).toBe(1);
    });

    it('should stack armor amounts', () => {
      const state = baseState({ hero: makeHero({ armor: 2, armorTurns: 1 }) });
      const card = makeCard({
        id: 'armor', name: 'Armor', type: CardType.Armor,
        manaCost: 1, armorAmount: 4, description: '',
      });

      const next = resolveArmorCard(state, card);

      expect(next.hero.armor).toBe(6); // 2 + 4
    });
  });

  describe('Skill card', () => {
    it('should heal the hero', () => {
      const state = baseState({ hero: makeHero({ hp: 10, maxHp: 20 }) });
      const card = makeCard({
        id: 'heal', name: 'Heal', type: CardType.Skill,
        manaCost: 2, healAmount: 4, description: '',
      });

      const next = resolveSkillCard(state, card);

      expect(next.hero.hp).toBe(14);
    });

    it('should not overheal past max HP', () => {
      const state = baseState({ hero: makeHero({ hp: 18, maxHp: 20 }) });
      const card = makeCard({
        id: 'heal', name: 'Heal', type: CardType.Skill,
        manaCost: 2, healAmount: 10, description: '',
      });

      const next = resolveSkillCard(state, card);

      expect(next.hero.hp).toBe(20);
    });

    it('should buff attack', () => {
      const state = baseState();
      const card = makeCard({
        id: 'buff_attack', name: 'Buff', type: CardType.Skill,
        manaCost: 1, buffAttack: 2, description: '',
      });

      const next = resolveSkillCard(state, card);

      expect(next.hero.baseAttack).toBe(4); // 2 + 2
    });
  });

  describe('Summon card', () => {
    it('should place a summon unit on the grid', () => {
      const state = baseState();
      const card = makeCard({
        id: 'summon', name: 'Summon', type: CardType.Summon,
        manaCost: 2,
        summonUnit: { attack: 2, maxHp: 3, moveRange: 2, attackRange: 1, hasProvoke: false, moveType: MoveType.Normal },
        description: '',
      });
      const targetPos = { x: 2, y: 2 }; // adjacent to hero at (1,2)

      const next = resolveSummonCard(state, card, targetPos);

      // Summon gets ID "summon_0" (summonIdCounter starts at 0)
      const summonId = `summon_0`;
      const summonUnit = next.grid.units.get(summonId);
      expect(summonUnit).toBeDefined();
      expect(summonUnit!.type).toBe('summon');
      expect(summonUnit!.position).toEqual(targetPos);
    });

    it('should not place summon on occupied tile', () => {
      const state = baseState();
      const card = makeCard({
        id: 'summon', name: 'Summon', type: CardType.Summon,
        manaCost: 2,
        summonUnit: { attack: 2, maxHp: 3, moveRange: 2, attackRange: 1, hasProvoke: false, moveType: MoveType.Normal },
        description: '',
      });

      // Hero is at (1,2) - try to summon on hero's position
      const targetPos = { x: 1, y: 2 };
      const next = resolveSummonCard(state, card, targetPos);

      expect(next.grid.units.size).toBe(state.grid.units.size);
    });

    it('should not place summon on non-adjacent tile', () => {
      const state = baseState();
      const card = makeCard({
        id: 'summon', name: 'Summon', type: CardType.Summon,
        manaCost: 2,
        summonUnit: { attack: 2, maxHp: 3, moveRange: 2, attackRange: 1, hasProvoke: false, moveType: MoveType.Normal },
        description: '',
      });

      // Far from hero at (1,2)
      const targetPos = { x: 8, y: 4 };
      const next = resolveSummonCard(state, card, targetPos);

      expect(next.grid.units.size).toBe(state.grid.units.size);
    });
  });

  describe('Passive card', () => {
    it('should add passive to state', () => {
      const state = baseState();
      const card = makeCard({
        id: 'deep_focus', name: 'Deep Focus', type: CardType.Passive,
        manaCost: 1, passiveEffect: 'manaRegen', description: '',
      });

      const next = resolvePassiveCard(state, card);

      // Passive should be stored in state
      expect(next).not.toBe(state);
      expect(next.passives).toHaveLength(1);
      expect(next.passives[0].effect).toBe('manaRegen');
    });

    it('should not add duplicate passive', () => {
      const state = { ...baseState(), passives: [{ cardId: 'deep_focus', effect: 'manaRegen' }] };
      const card = makeCard({
        id: 'deep_focus', name: 'Deep Focus', type: CardType.Passive,
        manaCost: 1, passiveEffect: 'manaRegen', description: '',
      });

      const next = resolvePassiveCard(state, card);

      expect(next.passives).toHaveLength(1);
    });
  });
});
