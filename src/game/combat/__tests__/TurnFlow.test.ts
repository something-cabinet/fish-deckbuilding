import { describe, it, expect } from 'vitest';
import { startBattle, startPlayerTurn, drawToMaxHand } from '../TurnFlow';
import { HERO_MAX_HAND, type RunState, type EnemyInstance } from '../CardTypes';

describe('TurnFlow', () => {
  describe('drawToMaxHand', () => {
    it('should draw cards up to maxHand', () => {
      const result = drawToMaxHand([], ['a', 'b', 'c', 'd', 'e'], 3);
      expect(result.hand).toEqual(['a', 'b', 'c']);
      expect(result.deck).toEqual(['d', 'e']);
    });

    it('should not draw if hand is already at max', () => {
      const result = drawToMaxHand(['a', 'b', 'c'], ['d', 'e'], 3);
      expect(result.hand).toEqual(['a', 'b', 'c']);
      expect(result.deck).toEqual(['d', 'e']);
    });

    it('should draw remaining if deck has fewer cards than needed', () => {
      const result = drawToMaxHand([], ['a'], 3);
      expect(result.hand).toEqual(['a']);
      expect(result.deck).toEqual([]);
    });
  });

  describe('startBattle', () => {
    const runState: RunState = {
      heroHp: 30,
      heroMaxHp: 30,
      heroMaxHand: 4,
      creditLimit: 5,
      gold: 0,
      deck: ['fin_slash', 'fin_slash_2', 'fin_slash_3', 'bubble_shield', 'bubble_shield_2', 'ink_cloud', 'ink_cloud_2', 'desperate_strike', 'take_cover', 'small_loan'],
      mapNodes: [],
      currentNodeId: '',
      relics: [],
      allies: [],
      seed: 42,
      act: 1,
      battleIndex: 0,
    };

    it('should create combat state with enemies', () => {
      const enemies: EnemyInstance[] = [
        { id: 'e1', name: 'Small Crab', hp: 6, maxHp: 6, attack: 2, defense: 1, intent: 'attack', isBoss: false },
      ];

      const combatState = startBattle(runState, enemies, 'test_encounter', 10, []);

      expect(combatState.hand.length).toBeLessThanOrEqual(runState.heroMaxHand);
      expect(combatState.battleDeck.length).toBeGreaterThan(0);
      expect(combatState.battleDiscard).toEqual([]);
      expect(combatState.turnPhase).toBe('draw');
      expect(combatState.turnNumber).toBe(1);
      expect(combatState.encounterId).toBe('test_encounter');
      expect(combatState.rewardGold).toBe(10);
      expect(combatState.heroHp).toBe(30);
      expect(combatState.coins).toBe(0);
      expect(combatState.enemies).toHaveLength(1);
      expect(combatState.enemies[0].id).toBe('e1');
    });

    it('should use deterministic seed for deck shuffle', () => {
      const combatState1 = startBattle(runState, [], 'test', 10, []);
      const combatState2 = startBattle(runState, [], 'test', 10, []);

      expect(combatState1.hand).toEqual(combatState2.hand);
      expect(combatState1.battleDeck).toEqual(combatState2.battleDeck);
    });

    it('should not modify the run deck', () => {
      const originalDeck = [...runState.deck];
      startBattle(runState, [], 'test', 10, []);
      expect(runState.deck).toEqual(originalDeck);
    });
  });

  describe('startPlayerTurn', () => {
    it('should draw cards, reset coins, and transition to play phase', () => {
      const combatState = {
        hand: [],
        battleDeck: ['fin_slash', 'bubble_shield', 'ink_cloud', 'desperate_strike', 'take_cover'],
        battleDiscard: [],
        sellPile: [],
        coins: 3,
        creditUsed: 0,
        enemies: [] as EnemyInstance[],
        heroHp: 30,
        heroMaxHp: 30,
        turnPhase: 'draw' as const,
        turnNumber: 1,
        encounterId: '',
        rewardGold: 0,
        rewardCards: [] as string[],
        interestDue: 0,
        enemyActions: [],
        aiStrategy: 'balanced' as const,
      };

      const result = startPlayerTurn(combatState);

      expect(result.hand.length).toBe(4); // HERO_MAX_HAND
      expect(result.battleDeck.length).toBe(1); // 5 - 4 = 1
      expect(result.turnPhase).toBe('play');
      expect(result.coins).toBe(0); // FaB-style reset
    });

    it('should apply interest damage when coins are negative', () => {
      const combatState = {
        hand: [],
        battleDeck: ['fin_slash', 'bubble_shield'],
        battleDiscard: [],
        sellPile: [],
        coins: -3,
        creditUsed: 3,
        enemies: [] as EnemyInstance[],
        heroHp: 30,
        heroMaxHp: 30,
        turnPhase: 'draw' as const,
        turnNumber: 2,
        encounterId: '',
        rewardGold: 0,
        rewardCards: [] as string[],
        interestDue: 0,
        enemyActions: [],
        aiStrategy: 'balanced' as const,
      };

      const result = startPlayerTurn(combatState);

      // Interest damage = |coins| = 3
      expect(result.heroHp).toBe(27);
      expect(result.interestDue).toBe(3);
      expect(result.coins).toBe(0); // Reset to 0
    });
  });
});
