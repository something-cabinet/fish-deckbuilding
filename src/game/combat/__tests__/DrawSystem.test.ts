/**
 * DrawSystem unit tests — shuffle, draw, replace, hand cap.
 */
import { describe, it, expect } from 'vitest';
import { shuffleDeck, drawCards, replaceCardFromHand, canReplace } from '../DrawSystem';
import { TurnPhase, CardType } from '../CardTypes';
import type { CombatState, CombatCard, CardDefinition } from '../CardTypes';

function makeCard(id: string, defOverrides: Partial<CardDefinition> = {}): CombatCard {
  return {
    id,
    instanceId: `${id}_test`,
    definition: {
      id,
      name: id,
      type: CardType.Attack,
      manaCost: 1,
      description: '',
      ...defOverrides,
    },
  };
}

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

describe('DrawSystem', () => {
  describe('shuffleDeck', () => {
    it('should produce a different order than input', () => {
      const cards = [
        makeCard('a'), makeCard('b'), makeCard('c'),
        makeCard('d'), makeCard('e'),
      ];
      const original = cards.map(c => c.id);
      const shuffled = shuffleDeck(cards, 12345);
      const shuffledIds = shuffled.map(c => c.id);
      // With 5 cards, there's a 1/120 chance they stay in same order
      expect(shuffledIds).not.toEqual(original);
      expect(shuffledIds.sort()).toEqual(original.sort());
    });

    it('should be deterministic with same seed', () => {
      const cards = [
        makeCard('a'), makeCard('b'), makeCard('c'),
        makeCard('d'), makeCard('e'),
      ];
      const a = shuffleDeck(cards, 42);
      const b = shuffleDeck(cards, 42);
      expect(a.map(c => c.id)).toEqual(b.map(c => c.id));
    });
  });

  describe('drawCards', () => {
    it('should reduce deck and add to hand', () => {
      const state = makeState({
        deck: [makeCard('a'), makeCard('b'), makeCard('c')],
      });
      const next = drawCards(state, 2);

      expect(next.hand).toHaveLength(2);
      expect(next.deck).toHaveLength(1);
      expect(next.discard).toHaveLength(0);
    });

    it('should reshuffle discard when deck is empty', () => {
      const state = makeState({
        deck: [makeCard('a')],
        discard: [makeCard('b'), makeCard('c')],
        hand: [],
      });
      // Draw 2 — deck has 1, so one needs to come from reshuffled discard
      const next = drawCards(state, 2);

      expect(next.hand).toHaveLength(2);
      // After drawing all from deck (1) + reshuffling discard for the 2nd
      expect(next.deck.length).toBeLessThanOrEqual(1);
      expect(next.discard).toHaveLength(0);
    });

    it('should respect hand cap of 5', () => {
      const hand = Array(5).fill(null).map((_, i) => makeCard(`hand${i}`));
      const state = makeState({
        hand,
        deck: [makeCard('extra')],
      });
      const next = drawCards(state, 3);

      expect(next.hand).toHaveLength(5); // Already at cap, no draw happens
      expect(next.deck).toHaveLength(1);
    });
  });

  describe('replaceCardFromHand', () => {
    it('should replace card correctly', () => {
      const state = makeState({
        hand: [makeCard('a'), makeCard('b')],
        deck: [makeCard('c'), makeCard('d')],
      });

      const replaced = state.hand[0].instanceId;
      const next = replaceCardFromHand(state, 0);

      expect(next.hand).toHaveLength(2); // Removed 1, drew 1
      expect(next.canReplace).toBe(false);
      expect(next.hand[0].instanceId).not.toBe(replaced); // Card at index 0 is different
    });

    it('should return unchanged state for invalid index', () => {
      const state = makeState({
        hand: [makeCard('a')],
      });
      const next = replaceCardFromHand(state, 5);

      expect(next).toBe(state);
    });

    it('should return unchanged state for negative index', () => {
      const state = makeState({
        hand: [makeCard('a')],
      });
      const next = replaceCardFromHand(state, -1);

      expect(next).toBe(state);
    });
  });

  describe('canReplace', () => {
    it('should return true when canReplace is true and in PlayerAction phase', () => {
      const state = makeState({ canReplace: true, turnPhase: TurnPhase.PlayerAction });
      expect(canReplace(state)).toBe(true);
    });

    it('should return false when canReplace is false', () => {
      const state = makeState({ canReplace: false, turnPhase: TurnPhase.PlayerAction });
      expect(canReplace(state)).toBe(false);
    });

    it('should return false when not in PlayerAction phase', () => {
      const state = makeState({ canReplace: true, turnPhase: TurnPhase.EnemyTurn });
      expect(canReplace(state)).toBe(false);
    });
  });
});
