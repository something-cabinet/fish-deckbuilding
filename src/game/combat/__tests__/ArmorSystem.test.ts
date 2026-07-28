/**
 * ArmorSystem unit tests — apply armor, tick, damage with armor, summon handling.
 */
import { describe, it, expect } from 'vitest';
import { applyArmor, tickArmor, damageWithArmor } from '../ArmorSystem';
import { TurnPhase, MoveType } from '../CardTypes';
import { TileType } from '../../grid/GridTypes';
import type { CombatState, CombatSummon } from '../CardTypes';

function makeState(overrides: Partial<CombatState> = {}): CombatState {
  return {
    grid: { tiles: [], units: new Map(), width: 9, height: 5 },
    hero: { id: 'hero', unitId: 'hero_unit', hp: 20, maxHp: 20, baseAttack: 2, armor: 0, armorTurns: 0 },
    enemies: [],
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
    ...overrides,
  };
}

describe('ArmorSystem', () => {
  describe('applyArmor', () => {
    it('should set armor on hero', () => {
      const state = makeState();
      const next = applyArmor(state, 'hero_unit', 5, 2);

      expect(next.hero.armor).toBe(5);
      expect(next.hero.armorTurns).toBe(2);
    });

    it('should stack armor on hero', () => {
      const state = makeState({
        hero: { id: 'hero', unitId: 'hero_unit', hp: 20, maxHp: 20, baseAttack: 2, armor: 3, armorTurns: 1 },
      });
      const next = applyArmor(state, 'hero_unit', 4, 2);

      expect(next.hero.armor).toBe(7);
      expect(next.hero.armorTurns).toBe(2); // Max of 1 and 2
    });
  });

  describe('tickArmor', () => {
    it('should decrement armor turns and remove expired armor', () => {
      const state = makeState({
        hero: { id: 'hero', unitId: 'hero_unit', hp: 20, maxHp: 20, baseAttack: 2, armor: 5, armorTurns: 1 },
      });
      const next = tickArmor(state);

      expect(next.hero.armor).toBe(0);
      expect(next.hero.armorTurns).toBe(0);
    });

    it('should keep armor when turns remain', () => {
      const state = makeState({
        hero: { id: 'hero', unitId: 'hero_unit', hp: 20, maxHp: 20, baseAttack: 2, armor: 5, armorTurns: 3 },
      });
      const next = tickArmor(state);

      expect(next.hero.armor).toBe(5);
      expect(next.hero.armorTurns).toBe(2);
    });
  });

  describe('damageWithArmor', () => {
    it('should absorb damage with armor first on hero', () => {
      const state = makeState({
        hero: { id: 'hero', unitId: 'hero_unit', hp: 20, maxHp: 20, baseAttack: 2, armor: 5, armorTurns: 1 },
      });
      const result = damageWithArmor(state, 'hero_unit', 7);

      expect(result.state.hero.armor).toBe(0); // 5 - 5
      expect(result.state.hero.hp).toBe(18); // 20 - 2
      expect(result.actualDamage).toBe(2); // HP damage dealt
    });

    it('should apply full damage when no armor on hero', () => {
      const state = makeState();
      const result = damageWithArmor(state, 'hero_unit', 7);

      expect(result.state.hero.armor).toBe(0);
      expect(result.state.hero.hp).toBe(13);
      expect(result.actualDamage).toBe(7);
    });

    it('should damage summons', () => {
      const state = makeState({
        summons: [{
          id: 'combat_summon_0',
          unitId: 'summon_0',
          hp: 5,
          maxHp: 5,
          attack: 2,
        }],
      });
      const result = damageWithArmor(state, 'summon_0', 3);

      expect(result.state.summons[0].hp).toBe(2);
      expect(result.actualDamage).toBe(3);
    });

    it('should remove dead summons from state', () => {
      const state = makeState({
        grid: {
          tiles: [
            [{ position: { x: 0, y: 0 }, type: TileType.Floor, occupiedBy: 'summon_0' }],
          ],
          units: new Map([['summon_0', {
            id: 'summon_0', type: 'summon' as const, faction: 'player' as const,
            position: { x: 0, y: 0 }, moveType: MoveType.Normal, moveRange: 2, attackRange: 1,
            hasProvoke: false, hasActed: false, hasMoved: false, hasAttacked: false, isAlive: true,
          }]]),
          width: 1, height: 1,
        },
        summons: [{
          id: 'combat_summon_0',
          unitId: 'summon_0',
          hp: 5,
          maxHp: 5,
          attack: 2,
        }],
      });
      const result = damageWithArmor(state, 'summon_0', 10);

      expect(result.state.summons).toHaveLength(0);
      expect(result.state.grid.units.has('summon_0')).toBe(false);
      expect(result.state.grid.tiles[0][0].occupiedBy).toBeNull();
    });
  });
});
