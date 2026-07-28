/**
 * ManaSystem unit tests — mana per turn, spend, canPlayCard.
 */
import { describe, it, expect } from 'vitest';
import { getManaForTurn, canPlayCard, spendMana } from '../ManaSystem';
import { TurnPhase } from '../CardTypes';
import type { CombatState } from '../CardTypes';

function makeState(overrides: Partial<CombatState> = {}): CombatState {
  return {
    grid: { tiles: [], units: new Map(), width: 9, height: 5 },
    hero: { id: 'hero', unitId: 'hero_unit', hp: 20, maxHp: 20, baseAttack: 2, armor: 0, armorTurns: 0 },
    enemies: [],
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

describe('ManaSystem', () => {
  describe('getManaForTurn', () => {
    it('should return 1 for turn 1', () => {
      expect(getManaForTurn(1)).toBe(1);
    });

    it('should return 5 for turn 5', () => {
      expect(getManaForTurn(5)).toBe(5);
    });

    it('should cap at 9 for turn 10', () => {
      expect(getManaForTurn(10)).toBe(9);
    });
  });

  describe('canPlayCard', () => {
    it('should return true when mana is sufficient', () => {
      const state = makeState({ mana: 5, turnPhase: TurnPhase.PlayerAction });
      expect(canPlayCard(state, 3)).toBe(true);
    });

    it('should return false when mana is insufficient', () => {
      const state = makeState({ mana: 2, turnPhase: TurnPhase.PlayerAction });
      expect(canPlayCard(state, 3)).toBe(false);
    });

    it('should return false when not in PlayerAction phase', () => {
      const state = makeState({ mana: 5, turnPhase: TurnPhase.EnemyTurn });
      expect(canPlayCard(state, 3)).toBe(false);
    });
  });

  describe('spendMana', () => {
    it('should deduct mana correctly', () => {
      const state = makeState({ mana: 5 });
      const next = spendMana(state, 3);
      expect(next.mana).toBe(2);
    });

    it('should return state unchanged if amount exceeds mana', () => {
      const state = makeState({ mana: 2 });
      const next = spendMana(state, 5);
      expect(next).toBe(state);
    });
  });
});
