import { describe, it, expect } from 'vitest';
import { sellCard, canPlayCard, spendCoins, calculateInterest, canAffordWithCredit } from '../CoinSystem';

describe('CoinSystem', () => {
  describe('sellCard', () => {
    it('should remove sold card from hand and gain coins (no deck modification)', () => {
      const hand = ['fin_slash', 'bubble_shield', 'ink_cloud'];

      const result = sellCard(hand, 1, 0); // sell bubble_shield at index 1

      expect(result.hand).toEqual(['fin_slash', 'ink_cloud']);
      expect(result.coins).toBe(1); // bubble_shield.coinValue = 1
    });

    it('should return unchanged if cardIndex out of bounds', () => {
      const hand = ['fin_slash'];

      const result = sellCard(hand, 5, 0);

      expect(result.hand).toEqual(hand);
      expect(result.coins).toBe(0);
    });

    it('should add coinValue to coins', () => {
      const hand = ['small_loan'];

      const result = sellCard(hand, 0, 2);

      expect(result.coins).toBe(5); // 2 + 3 = 5
    });
  });

  describe('canPlayCard', () => {
    it('should return true if coins are sufficient', () => {
      const card = { cost: 1, id: 'test', name: 'test', type: 'action' as const, coinValue: 1 as const, attack: 3, defense: 1, description: '', color: '#fff' };
      expect(canPlayCard(card, 2, 5)).toBe(true);
    });

    it('should return true if credit covers the cost', () => {
      const card = { cost: 2, id: 'test', name: 'test', type: 'action' as const, coinValue: 1 as const, attack: 3, defense: 1, description: '', color: '#fff' };
      expect(canPlayCard(card, 0, 5)).toBe(true); // goes to -2, within credit limit of 5
    });

    it('should return false if credit limit is exceeded', () => {
      const card = { cost: 6, id: 'test', name: 'test', type: 'action' as const, coinValue: 1 as const, attack: 3, defense: 1, description: '', color: '#fff' };
      expect(canPlayCard(card, 0, 5)).toBe(false); // goes to -6, below -5 limit
    });

    it('should return false for undefined card', () => {
      expect(canPlayCard(undefined, 5, 5)).toBe(false);
    });
  });

  describe('spendCoins', () => {
    it('should subtract cost from coins', () => {
      expect(spendCoins(5, 2)).toBe(3);
    });

    it('should return negative if cost exceeds coins', () => {
      expect(spendCoins(1, 3)).toBe(-2);
    });
  });

  describe('calculateInterest', () => {
    it('should return 0 if coins >= 0', () => {
      expect(calculateInterest(3)).toBe(0);
      expect(calculateInterest(0)).toBe(0);
    });

    it('should return absolute value if coins < 0', () => {
      expect(calculateInterest(-2)).toBe(2);
      expect(calculateInterest(-5)).toBe(5);
    });
  });

  describe('canAffordWithCredit', () => {
    it('should return true if within credit limit', () => {
      expect(canAffordWithCredit(1, 2, 5)).toBe(true); // 1-2 = -1, >= -5
    });

    it('should return false if beyond credit limit', () => {
      expect(canAffordWithCredit(1, 10, 5)).toBe(false); // 1-10 = -9, < -5
    });
  });
});
