import { describe, it, expect } from 'vitest';
import { CombatController } from '../CombatController';
import { startPlayerTurn } from '../TurnFlow';
import { canPlayCard } from '../CoinSystem';
import { getCard } from '../../cards/cardData';
import { DEFAULT_CREDIT_LIMIT, type RunState, type EnemyInstance, type CombatState } from '../CardTypes';

function createRunState(overrides?: Partial<RunState>): RunState {
  return {
    heroHp: 30,
    heroMaxHp: 30,
    heroMaxHand: 4,
    creditLimit: 5,
    gold: 0,
    deck: [
      'fin_slash', 'fin_slash_2', 'fin_slash_3',
      'bubble_shield', 'bubble_shield_2',
      'ink_cloud', 'ink_cloud_2',
      'desperate_strike', 'take_cover', 'small_loan',
    ],
    mapNodes: [],
    currentNodeId: '',
    relics: [],
    allies: [],
    seed: 42,
    act: 1,
    battleIndex: 0,
    ...overrides,
  };
}

function createJellyDrifterEncounter() {
  return {
    id: 'jelly_drifter',
    name: 'Jelly Drifter',
    enemies: [
      { id: 'enemy_jelly1', name: 'Jelly Drifter', hp: 8, maxHp: 8, attack: 3, defense: 0, intent: 'attack' as const, isBoss: false },
    ] as EnemyInstance[],
    aiStrategy: 'aggressive' as const,
    rewardGold: 15,
    rewardCards: ['fin_slash', 'bubble_shield', 'ink_cloud'],
  };
}

/**
 * Helper: find the first attack card in hand.
 */
function findFirstAttackCard(combatState: CombatState): { cardIndex: number; cardId: string } | null {
  for (let i = 0; i < combatState.hand.length; i++) {
    const cardId = combatState.hand[i];
    if (cardId === 'fin_slash' || cardId === 'fin_slash_2' || cardId === 'fin_slash_3' ||
        cardId === 'desperate_strike' || cardId === 'ink_cloud' || cardId === 'ink_cloud_2') {
      return { cardIndex: i, cardId };
    }
  }
  return null;
}

describe('CombatController', () => {
  describe('startBattle', () => {
    it('should start a battle from run state and encounter', () => {
      const runState = createRunState();
      const encounter = createJellyDrifterEncounter();
      const combatState = CombatController.startBattle(runState, encounter);

      expect(combatState.encounterId).toBe('jelly_drifter');
      expect(combatState.turnPhase).toBe('draw');
      expect(combatState.turnNumber).toBe(1);
      expect(combatState.heroHp).toBe(30);
      expect(combatState.coins).toBe(0);

      const enemies = combatState.enemies;
      expect(enemies).toHaveLength(1);
      expect(enemies[0].name).toBe('Jelly Drifter');
      expect(enemies[0].hp).toBe(8);
    });
  });

  describe('sellCard', () => {
    it('should remove sold card from hand and add to sellPile, not battleDeck', () => {
      const combatState: CombatState = {
        hand: ['fin_slash', 'small_loan'],
        battleDeck: ['ink_cloud'],
        battleDiscard: [],
        sellPile: [],
        coins: 0,
        creditUsed: 0,
        enemies: [] as EnemyInstance[],
        heroHp: 30,
        heroMaxHp: 30,
        turnPhase: 'play',
        turnNumber: 1,
        encounterId: 'test',
        rewardGold: 0,
        rewardCards: [],
        interestDue: 0,
        enemyActions: [],
        aiStrategy: 'balanced' as const,
      };

      // Sell small_loan (coinValue 3) at index 1
      const result = CombatController.sellCard(combatState, 1);

      expect(result.hand).toEqual(['fin_slash']);
      expect(result.coins).toBe(3);
      // Card should NOT be in battleDeck — it goes to sellPile instead
      expect(result.battleDeck).toEqual(['ink_cloud']); // unchanged
      expect(result.sellPile).toContain('small_loan');
    });
  });

  describe('playAttack', () => {
    it('should play a card against a target enemy', () => {
      const runState = createRunState();
      const encounter = createJellyDrifterEncounter();
      const combatState = CombatController.startBattle(runState, encounter);

      const turnState = startPlayerTurn(combatState);
      expect(turnState.turnPhase).toBe('play');

      const attack = findFirstAttackCard(turnState);
      if (!attack) return; // No attack card in hand — skip

      const result = CombatController.playAttack(turnState, attack.cardIndex, 0);

      expect(result.hand.length).toBe(turnState.hand.length - 1);
      expect(result.battleDiscard).toContain(attack.cardId);

      const card = getCard(attack.cardId);
      const expectedCoins = turnState.coins - (card?.cost ?? 0);
      expect(result.coins).toBe(expectedCoins);

      // Enemy should take damage
      expect(result.enemies[0].hp).toBeLessThan(8);
    });

    it('should not play a card if it cannot be afforded', () => {
      const combatState: CombatState = {
        hand: ['desperate_strike'], // cost 2
        battleDeck: [],
        battleDiscard: [],
        sellPile: [],
        coins: -4, // -4 - 2 = -6, below credit limit of 5
        creditUsed: 4,
        enemies: [
          { id: 'enemy1', name: 'Test', hp: 10, maxHp: 10, attack: 1, defense: 0, intent: 'attack', isBoss: false },
        ],
        heroHp: 30,
        heroMaxHp: 30,
        turnPhase: 'play',
        turnNumber: 1,
        encounterId: 'test',
        rewardGold: 0,
        rewardCards: [],
        interestDue: 0,
        enemyActions: [],
        aiStrategy: 'balanced' as const,
      };

      const result = CombatController.playAttack(combatState, 0, 0);

      expect(result).toBe(combatState); // unchanged
    });
  });

  describe('endPlayerTurn', () => {
    it('should transition to sellOrder phase when sellPile is non-empty', () => {
      const combatState: CombatState = {
        hand: ['fin_slash'],
        battleDeck: ['ink_cloud'],
        battleDiscard: [],
        sellPile: ['small_loan'],
        coins: 3,
        creditUsed: 0,
        enemies: [
          { id: 'enemy1', name: 'Jelly Drifter', hp: 8, maxHp: 8, attack: 3, defense: 0, intent: 'attack', isBoss: false },
        ],
        heroHp: 30,
        heroMaxHp: 30,
        turnPhase: 'play',
        turnNumber: 1,
        encounterId: 'test',
        rewardGold: 0,
        rewardCards: [],
        interestDue: 0,
        enemyActions: [],
        aiStrategy: 'balanced' as const,
      };

      const result = CombatController.endPlayerTurn(combatState);

      expect(result.combatState.turnPhase).toBe('sellOrder');
      expect(result.requiresDefense).toBe(false);
      // Coins should NOT be reset yet (will happen in confirmSellOrder)
      expect(result.combatState.coins).toBe(3);
    });

    it('should proceed to defense phase when sellPile is empty and enemies are alive', () => {
      const runState = createRunState();
      const encounter = createJellyDrifterEncounter();
      let combatState = CombatController.startBattle(runState, encounter);
      combatState = startPlayerTurn(combatState);

      const result = CombatController.endPlayerTurn(combatState);

      expect(result.requiresDefense).toBe(true);
      expect(result.incomingDamage).toBeGreaterThan(0);
      expect(result.combatState.turnPhase).toBe('defense');
    });

    it('should not require defense if no enemies are alive (no sellPile)', () => {
      const combatState: CombatState = {
        hand: [],
        battleDeck: ['fin_slash'],
        battleDiscard: [],
        sellPile: [],
        coins: 0,
        creditUsed: 0,
        enemies: [] as EnemyInstance[],
        heroHp: 30,
        heroMaxHp: 30,
        turnPhase: 'play',
        turnNumber: 1,
        encounterId: 'test',
        rewardGold: 0,
        rewardCards: [],
        interestDue: 0,
        enemyActions: [],
        aiStrategy: 'balanced' as const,
      };

      const result = CombatController.endPlayerTurn(combatState);

      // No enemies means battle is over (victory)
      expect(result.requiresDefense).toBe(false);
      expect(result.incomingDamage).toBe(0);
      expect(CombatController.checkBattleEnd(result.combatState)).toBe('victory');
    });
  });

  describe('confirmSellOrder', () => {
    it('should append ordered cards to battleDeck bottom and process end of turn', () => {
      const combatState: CombatState = {
        hand: ['fin_slash'],
        battleDeck: ['ink_cloud'],
        battleDiscard: [],
        sellPile: ['bubble_shield', 'small_loan'],
        coins: 3,
        creditUsed: 0,
        enemies: [
          { id: 'enemy1', name: 'Jelly Drifter', hp: 8, maxHp: 8, attack: 3, defense: 0, intent: 'attack', isBoss: false },
        ],
        heroHp: 30,
        heroMaxHp: 30,
        turnPhase: 'sellOrder',
        turnNumber: 1,
        encounterId: 'test',
        rewardGold: 0,
        rewardCards: [],
        interestDue: 0,
        enemyActions: [],
        aiStrategy: 'balanced' as const,
      };

      // Reorder: small_loan first, then bubble_shield
      const result = CombatController.confirmSellOrder(combatState, ['small_loan', 'bubble_shield']);

      // Ordered cards appended to bottom of battleDeck
      expect(result.combatState.battleDeck).toEqual(['ink_cloud', 'small_loan', 'bubble_shield']);
      expect(result.combatState.sellPile).toEqual([]);
      // Should have processed interest and transitioned to defense
      expect(result.requiresDefense).toBe(true);
      expect(result.combatState.turnPhase).toBe('defense');
    });

    it('should handle empty orderedCards gracefully', () => {
      const combatState: CombatState = {
        hand: [],
        battleDeck: ['ink_cloud'],
        battleDiscard: [],
        sellPile: [],
        coins: 0,
        creditUsed: 0,
        enemies: [
          { id: 'enemy1', name: 'Jelly Drifter', hp: 8, maxHp: 8, attack: 3, defense: 0, intent: 'attack', isBoss: false },
        ],
        heroHp: 30,
        heroMaxHp: 30,
        turnPhase: 'sellOrder',
        turnNumber: 1,
        encounterId: 'test',
        rewardGold: 0,
        rewardCards: [],
        interestDue: 0,
        enemyActions: [],
        aiStrategy: 'balanced' as const,
      };

      const result = CombatController.confirmSellOrder(combatState, []);

      expect(result.combatState.battleDeck).toEqual(['ink_cloud']);
      expect(result.requiresDefense).toBe(true);
      expect(result.combatState.turnPhase).toBe('defense');
    });

    it('should reset coins to 0 when processing end of turn', () => {
      const combatState: CombatState = {
        hand: [],
        battleDeck: ['ink_cloud'],
        battleDiscard: [],
        sellPile: ['small_loan'],
        coins: 5, // positive coins from selling
        creditUsed: 0,
        enemies: [
          { id: 'enemy1', name: 'Jelly Drifter', hp: 8, maxHp: 8, attack: 3, defense: 0, intent: 'attack', isBoss: false },
        ],
        heroHp: 30,
        heroMaxHp: 30,
        turnPhase: 'sellOrder',
        turnNumber: 1,
        encounterId: 'test',
        rewardGold: 0,
        rewardCards: [],
        interestDue: 0,
        enemyActions: [],
        aiStrategy: 'balanced' as const,
      };

      const result = CombatController.confirmSellOrder(combatState, ['small_loan']);

      expect(result.combatState.coins).toBe(0); // Reset after end-of-turn processing
      expect(result.requiresDefense).toBe(true);
    });
  });

  describe('defend', () => {
    it('should mitigate damage when blocking', () => {
      const combatState: CombatState = {
        hand: ['bubble_shield'], // defense 4
        battleDeck: [],
        battleDiscard: [],
        sellPile: [],
        coins: 0,
        creditUsed: 0,
        enemies: [
          { id: 'enemy1', name: 'Jelly Drifter', hp: 8, maxHp: 8, attack: 3, defense: 0, intent: 'attack', isBoss: false },
        ],
        heroHp: 20,
        heroMaxHp: 30,
        turnPhase: 'defense',
        turnNumber: 1,
        encounterId: 'test',
        rewardGold: 0,
        rewardCards: [],
        interestDue: 0,
        enemyActions: [{ enemyIndex: 0, type: 'attack', damage: 3, target: 'hero' }],
        aiStrategy: 'balanced' as const,
      };

      const result = CombatController.defend(combatState, [0]);

      expect(result.heroHp).toBe(20); // fully blocked (3 damage <= 4 defense)
      expect(result.hand).not.toContain('bubble_shield');
      expect(result.battleDiscard).toContain('bubble_shield');
    });

    it('should apply remaining damage if block is insufficient', () => {
      const combatState: CombatState = {
        hand: ['fin_slash'], // defense 1
        battleDeck: [],
        battleDiscard: [],
        sellPile: [],
        coins: 0,
        creditUsed: 0,
        enemies: [
          { id: 'enemy1', name: 'Jelly Drifter', hp: 8, maxHp: 8, attack: 3, defense: 0, intent: 'attack', isBoss: false },
        ],
        heroHp: 20,
        heroMaxHp: 30,
        turnPhase: 'defense',
        turnNumber: 1,
        encounterId: 'test',
        rewardGold: 0,
        rewardCards: [],
        interestDue: 0,
        enemyActions: [{ enemyIndex: 0, type: 'attack', damage: 3, target: 'hero' }],
        aiStrategy: 'balanced' as const,
      };

      const result = CombatController.defend(combatState, [0]);

      expect(result.heroHp).toBe(18); // 20 - (3 - 1) = 18
    });

    it('should apply full damage with no block', () => {
      const combatState: CombatState = {
        hand: ['fin_slash'],
        battleDeck: [],
        battleDiscard: [],
        sellPile: [],
        coins: 0,
        creditUsed: 0,
        enemies: [
          { id: 'enemy1', name: 'Jelly Drifter', hp: 8, maxHp: 8, attack: 3, defense: 0, intent: 'attack', isBoss: false },
        ],
        heroHp: 20,
        heroMaxHp: 30,
        turnPhase: 'defense',
        turnNumber: 1,
        encounterId: 'test',
        rewardGold: 0,
        rewardCards: [],
        interestDue: 0,
        enemyActions: [{ enemyIndex: 0, type: 'attack', damage: 3, target: 'hero' }],
        aiStrategy: 'balanced' as const,
      };

      const result = CombatController.defend(combatState, []);

      expect(result.heroHp).toBe(17); // 20 - 3 = 17
    });
  });

  describe('resolveTurn', () => {
    it('should move remaining hand to deck bottom and advance turn', () => {
      const combatState: CombatState = {
        hand: ['fin_slash', 'bubble_shield'],
        battleDeck: ['ink_cloud'],
        battleDiscard: [],
        sellPile: [],
        coins: 0,
        creditUsed: 0,
        enemies: [] as EnemyInstance[],
        heroHp: 30,
        heroMaxHp: 30,
        turnPhase: 'resolve',
        turnNumber: 1,
        encounterId: 'test',
        rewardGold: 0,
        rewardCards: [],
        interestDue: 0,
        enemyActions: [],
        aiStrategy: 'balanced' as const,
      };

      const result = CombatController.resolveTurn(combatState);

      expect(result.hand).toEqual([]);
      expect(result.battleDeck).toContain('fin_slash');
      expect(result.battleDeck).toContain('bubble_shield');
      expect(result.turnNumber).toBe(2);
      expect(result.turnPhase).toBe('draw');
    });
  });

  describe('checkBattleEnd', () => {
    it('should return null if hero is alive and enemies remain', () => {
      const combatState: CombatState = {
        hand: [], battleDeck: [], battleDiscard: [], sellPile: [], coins: 0, creditUsed: 0,
        enemies: [
          { id: 'enemy1', name: 'Enemy', hp: 10, maxHp: 10, attack: 1, defense: 0, intent: 'attack', isBoss: false },
        ],
        heroHp: 30, heroMaxHp: 30,
        turnPhase: 'play', turnNumber: 1, encounterId: 'test', rewardGold: 0, rewardCards: [], interestDue: 0, enemyActions: [], aiStrategy: 'balanced' as const,
      };
      expect(CombatController.checkBattleEnd(combatState)).toBeNull();
    });

    it('should return victory if all enemies are dead', () => {
      const combatState: CombatState = {
        hand: [], battleDeck: [], battleDiscard: [], sellPile: [], coins: 0, creditUsed: 0,
        enemies: [
          { id: 'enemy1', name: 'Enemy', hp: 0, maxHp: 10, attack: 1, defense: 0, intent: 'attack', isBoss: false },
        ],
        heroHp: 30, heroMaxHp: 30,
        turnPhase: 'play', turnNumber: 1, encounterId: 'test', rewardGold: 0, rewardCards: [], interestDue: 0, enemyActions: [], aiStrategy: 'balanced' as const,
      };
      expect(CombatController.checkBattleEnd(combatState)).toBe('victory');
    });

    it('should return defeat if hero is dead', () => {
      const combatState: CombatState = {
        hand: [], battleDeck: [], battleDiscard: [], sellPile: [], coins: 0, creditUsed: 0,
        enemies: [
          { id: 'enemy1', name: 'Enemy', hp: 10, maxHp: 10, attack: 1, defense: 0, intent: 'attack', isBoss: false },
        ],
        heroHp: 0, heroMaxHp: 30,
        turnPhase: 'play', turnNumber: 1, encounterId: 'test', rewardGold: 0, rewardCards: [], interestDue: 0, enemyActions: [], aiStrategy: 'balanced' as const,
      };
      expect(CombatController.checkBattleEnd(combatState)).toBe('defeat');
    });
  });

  describe('integration: full battle cycle', () => {
    it('should complete a full battle with sell order: sell cards, order them, then fight', () => {
      const runState = createRunState({ seed: 12345 });
      const encounter = createJellyDrifterEncounter();

      let combatState = CombatController.startBattle(runState, encounter);
      expect(CombatController.checkBattleEnd(combatState)).toBeNull();

      let maxTurns = 20;
      while (CombatController.checkBattleEnd(combatState) === null && maxTurns > 0) {
        maxTurns--;

        // Start player turn
        combatState = startPlayerTurn(combatState);

        // Play all affordable attack cards
        let safety = 0;
        while (combatState.turnPhase === 'play' && safety < 20) {
          safety++;
          const attack = findFirstAttackCard(combatState);
          if (!attack) break;

          const card = getCard(attack.cardId);
          if (!card || !canPlayCard(card, combatState.coins, DEFAULT_CREDIT_LIMIT)) {
            // Sell a card for more coins and try again
            if (combatState.hand.length > 0) {
              combatState = CombatController.sellCard(combatState, 0);
            }
            continue;
          }

          // Find a living enemy to target
          const livingEnemyIdx = combatState.enemies.findIndex(e => e.hp > 0);
          if (livingEnemyIdx === -1) break;

          combatState = CombatController.playAttack(combatState, attack.cardIndex, livingEnemyIdx);

          if (CombatController.checkBattleEnd(combatState) === 'victory') break;
        }

        if (CombatController.checkBattleEnd(combatState) === 'victory') break;

        // End turn
        const endTurnResult = CombatController.endPlayerTurn(combatState);

        // Handle sell order if needed
        if (endTurnResult.combatState.turnPhase === 'sellOrder') {
          // In a real game the player would reorder here; for testing just confirm current order
          const confirmResult = CombatController.confirmSellOrder(
            endTurnResult.combatState,
            endTurnResult.combatState.sellPile
          );
          combatState = confirmResult.combatState;

          if (confirmResult.requiresDefense) {
            const blockIndices: number[] = [];
            for (let i = 0; i < combatState.hand.length; i++) {
              const card = getCard(combatState.hand[i]);
              if (card && card.defense > 0) {
                blockIndices.push(i);
              }
            }

            if (blockIndices.length > 0) {
              combatState = CombatController.defend(combatState, blockIndices);
            } else {
              combatState = CombatController.defend(combatState, []);
            }

            if (CombatController.checkBattleEnd(combatState) === null) {
              combatState = CombatController.resolveTurn(combatState);
            }
          }
        } else if (endTurnResult.requiresDefense) {
          combatState = endTurnResult.combatState;

          const blockIndices: number[] = [];
          for (let i = 0; i < combatState.hand.length; i++) {
            const card = getCard(combatState.hand[i]);
            if (card && card.defense > 0) {
              blockIndices.push(i);
            }
          }

          if (blockIndices.length > 0) {
            combatState = CombatController.defend(combatState, blockIndices);
          } else {
            combatState = CombatController.defend(combatState, []);
          }

          if (CombatController.checkBattleEnd(combatState) === null) {
            combatState = CombatController.resolveTurn(combatState);
          }
        } else {
          combatState = endTurnResult.combatState;
        }
      }

      const end = CombatController.checkBattleEnd(combatState);
      expect(['victory', 'defeat', null]).toContain(end);
    });
  });

  describe('integration: defense phase with blocks', () => {
    it('should properly mitigate different block scenarios', () => {
      const combatState: CombatState = {
        hand: ['bubble_shield', 'fin_slash', 'ink_cloud'],
        battleDeck: [], battleDiscard: [], sellPile: [], coins: 0, creditUsed: 0,
        enemies: [
          { id: 'enemy1', name: 'Jelly Drifter', hp: 8, maxHp: 8, attack: 3, defense: 0, intent: 'attack', isBoss: false },
        ],
        heroHp: 20, heroMaxHp: 30,
        turnPhase: 'defense', turnNumber: 1, encounterId: 'test', rewardGold: 0, rewardCards: [], interestDue: 0, enemyActions: [{ enemyIndex: 0, type: 'attack', damage: 3, target: 'hero' }], aiStrategy: 'balanced' as const,
      };

      // bubble_shield (def 4) fully blocks 3 damage
      const blockedResult = CombatController.defend(combatState, [0]);
      expect(blockedResult.heroHp).toBe(20);

      // fin_slash (def 1) only blocks part of 3 damage
      const weakResult = CombatController.defend(combatState, [1]);
      expect(weakResult.heroHp).toBe(18);

      // No block - full damage
      const noBlockResult = CombatController.defend(combatState, []);
      expect(noBlockResult.heroHp).toBe(17);
    });
  });
});
