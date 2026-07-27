import { describe, it, expect } from 'vitest';
import { CombatOrchestrator } from '../CombatOrchestrator';
import type { CombatState, RunState, EnemyInstance } from '../../combat/CardTypes';
import { getCard } from '../../cards/cardData';

// ───── Helpers (mirroring CombatController.test.ts pattern) ─────

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

function createToughEncounter() {
  return {
    id: 'tough_test',
    name: 'Tough Test',
    enemies: [
      { id: 'enemy_tough1', name: 'Tough Enemy', hp: 30, maxHp: 30, attack: 1, defense: 0, intent: 'attack' as const, isBoss: false },
    ] as EnemyInstance[],
    aiStrategy: 'aggressive' as const,
    rewardGold: 20,
    rewardCards: ['fin_slash'],
  };
}

/**
 * Find the first card in hand with attack > 0.
 */
function findFirstAttackCard(hand: string[]): { cardIndex: number; cardId: string } | null {
  for (let i = 0; i < hand.length; i++) {
    const card = getCard(hand[i]);
    if (card && card.attack > 0) {
      return { cardIndex: i, cardId: hand[i] };
    }
  }
  return null;
}

/**
 * Find the first card in hand with defense > 0.
 */
function findFirstDefenseCard(hand: string[]): { cardIndex: number; cardId: string } | null {
  for (let i = 0; i < hand.length; i++) {
    const card = getCard(hand[i]);
    if (card && card.defense > 0) {
      return { cardIndex: i, cardId: hand[i] };
    }
  }
  return null;
}

// ───── Tests ─────

describe('CombatOrchestrator', () => {
  describe('startBattle', () => {
    it('should initialize state correctly on startBattle', () => {
      const orchestrator = new CombatOrchestrator();
      const runState = createRunState();
      const encounter = createJellyDrifterEncounter();

      orchestrator.startBattle(
        runState,
        encounter.enemies,
        encounter.id,
        encounter.rewardGold,
        encounter.rewardCards,
      );

      const snapshot = orchestrator.getStateSnapshot();

      // Hand drawn up to max hand size (4)
      expect(snapshot.hand).toBeDefined();
      expect(snapshot.hand!.length).toBeGreaterThan(0);
      expect(snapshot.hand!.length).toBeLessThanOrEqual(4);

      // Coins start at 0
      expect(snapshot.coins).toBe(0);

      // Enemies exist with correct HP
      expect(snapshot.enemies).toBeDefined();
      expect(snapshot.enemies!).toHaveLength(1);
      expect(snapshot.enemies![0].hp).toBe(8);
      expect(snapshot.enemies![0].name).toBe('Jelly Drifter');

      // Turn phase should be 'play' (auto-started after startBattle)
      expect(snapshot.turnPhase).toBe('play');
      expect(snapshot.turnNumber).toBe(1);

      // Hero HP matches run state
      expect(snapshot.heroHp).toBe(30);
      expect(snapshot.heroMaxHp).toBe(30);
    });
  });

  describe('sellCard', () => {
    it('should remove card from hand, add to sellPile, and grant coins', () => {
      const orchestrator = new CombatOrchestrator();
      const runState = createRunState();
      const encounter = createJellyDrifterEncounter();

      orchestrator.startBattle(runState, encounter.enemies, encounter.id, encounter.rewardGold, encounter.rewardCards);

      const before = orchestrator.getStateSnapshot();
      const initialHandSize = before.hand!.length;

      // Sell the first card in hand
      orchestrator.sellCard(0);

      const after = orchestrator.getStateSnapshot();

      // Hand decreased by 1
      expect(after.hand!.length).toBe(initialHandSize - 1);

      // Coins increased by the card's coinValue (always > 0 for starter cards)
      expect(after.coins!).toBeGreaterThan(0);

      // Sell pile has the sold card
      expect(after.sellPile).toBeDefined();
      expect(after.sellPile!.length).toBe(1);
    });

    it('should handle selling the same card multiple times', () => {
      const orchestrator = new CombatOrchestrator();
      const runState = createRunState();
      const encounter = createJellyDrifterEncounter();

      orchestrator.startBattle(runState, encounter.enemies, encounter.id, encounter.rewardGold, encounter.rewardCards);

      const before = orchestrator.getStateSnapshot();
      const initialHandSize = before.hand!.length;

      // Sell two cards (index 0 each time — hand shifts)
      orchestrator.sellCard(0);
      orchestrator.sellCard(0);

      const after = orchestrator.getStateSnapshot();

      expect(after.hand!.length).toBe(initialHandSize - 2);
      expect(after.sellPile!.length).toBe(2);
    });
  });

  describe('playCard', () => {
    it('should reduce enemy HP and remove card from hand', () => {
      const orchestrator = new CombatOrchestrator();
      const runState = createRunState();
      const encounter = createJellyDrifterEncounter();

      orchestrator.startBattle(runState, encounter.enemies, encounter.id, encounter.rewardGold, encounter.rewardCards);

      const snapshot = orchestrator.getStateSnapshot();
      const attack = findFirstAttackCard(snapshot.hand!);
      if (!attack) return; // No attack card in hand — skip

      const card = getCard(attack.cardId);
      const enemyInitialHp = snapshot.enemies![0].hp;
      const initialHandSize = snapshot.hand!.length;

      orchestrator.playCard(attack.cardIndex, 0);

      const after = orchestrator.getStateSnapshot();

      // Enemy HP decreased by at least (card.attack - enemy.defense)
      const enemyDefense = encounter.enemies[0].defense; // 0
      const expectedMinDamage = (card?.attack ?? 0) - enemyDefense;
      expect(after.enemies![0].hp).toBeLessThanOrEqual(enemyInitialHp - expectedMinDamage);

      // Card removed from hand
      expect(after.hand!.length).toBeLessThan(initialHandSize);
    });

    it('should not play a card without enough coins', () => {
      const orchestrator = new CombatOrchestrator();

      // Use a deck of expensive cards so we can drive coins deeply negative
      const runState = createRunState({
        deck: ['desperate_strike', 'desperate_strike', 'desperate_strike', 'desperate_strike'],
      });

      // Use an enemy with enough HP to survive multiple strikes
      const encounter = createToughEncounter();

      orchestrator.startBattle(runState, encounter.enemies, encounter.id, encounter.rewardGold, encounter.rewardCards);

      // Play two desperate_strikes (cost 2 each) → coins = -4
      orchestrator.playCard(0, 0); // coins = -2
      const afterFirst = orchestrator.getStateSnapshot();
      expect(afterFirst.coins).toBe(-2);

      // Hand still has cards after first play
      orchestrator.playCard(0, 0); // coins = -4
      const afterSecond = orchestrator.getStateSnapshot();
      expect(afterSecond.coins).toBe(-4);

      // Try to play a third desperate_strike (cost 2, coins -4 → -6 < -5 credit limit)
      const beforeThird = orchestrator.getStateSnapshot();
      orchestrator.playCard(0, 0);

      const afterThird = orchestrator.getStateSnapshot();

      // State should be unchanged — hand, coins, and enemy HP same
      expect(afterThird.hand).toEqual(beforeThird.hand);
      expect(afterThird.coins).toBe(beforeThird.coins);
      expect(afterThird.enemies![0].hp).toBe(beforeThird.enemies![0].hp);
    });
  });

  describe('endPlayerTurn', () => {
    it('should transition to defense phase when sellPile is empty and enemies are alive', () => {
      const orchestrator = new CombatOrchestrator();
      const runState = createRunState();
      const encounter = createJellyDrifterEncounter();

      orchestrator.startBattle(runState, encounter.enemies, encounter.id, encounter.rewardGold, encounter.rewardCards);

      orchestrator.endPlayerTurn();

      const snapshot = orchestrator.getStateSnapshot();
      expect(snapshot.turnPhase).toBe('defense');
    });
  });

  describe('defend', () => {
    it('should reduce hero HP by incoming damage when no block is applied', () => {
      const orchestrator = new CombatOrchestrator();
      const runState = createRunState();
      const encounter = createJellyDrifterEncounter();

      orchestrator.startBattle(runState, encounter.enemies, encounter.id, encounter.rewardGold, encounter.rewardCards);
      orchestrator.endPlayerTurn();

      // Defend with no block cards, taking 5 damage
      const before = orchestrator.getStateSnapshot();
      orchestrator.defend([], 5);

      const after = orchestrator.getStateSnapshot();
      expect(after.heroHp).toBe(Math.max(0, before.heroHp! - 5));
    });

    it('should block partial or full damage with defense cards', () => {
      const orchestrator = new CombatOrchestrator();
      const runState = createRunState();
      const encounter = createJellyDrifterEncounter();

      orchestrator.startBattle(runState, encounter.enemies, encounter.id, encounter.rewardGold, encounter.rewardCards);
      orchestrator.endPlayerTurn();

      const snapshot = orchestrator.getStateSnapshot();

      // Find a card with defense value
      const defCard = findFirstDefenseCard(snapshot.hand!);
      if (!defCard) return; // No defense card in hand — skip

      const card = getCard(defCard.cardId);
      const cardDefense = card?.defense ?? 0;
      const incomingDamage = 5;
      const expectedDamage = Math.max(0, incomingDamage - cardDefense);
      const expectedHp = (snapshot.heroHp ?? 30) - expectedDamage;

      orchestrator.defend([defCard.cardIndex], incomingDamage);

      const after = orchestrator.getStateSnapshot();
      expect(after.heroHp).toBe(expectedHp);
    });
  });

  describe('checkBattleEnd', () => {
    it('should return null when hero is alive and enemies remain', () => {
      const orchestrator = new CombatOrchestrator();
      const runState = createRunState();
      const encounter = createJellyDrifterEncounter();

      orchestrator.startBattle(runState, encounter.enemies, encounter.id, encounter.rewardGold, encounter.rewardCards);

      const result = orchestrator.checkBattleEnd();
      expect(result).toBeNull();
    });

    it('should return defeat when hero HP reaches 0', () => {
      const orchestrator = new CombatOrchestrator();
      const runState = createRunState();
      const encounter = createJellyDrifterEncounter();

      orchestrator.startBattle(runState, encounter.enemies, encounter.id, encounter.rewardGold, encounter.rewardCards);

      // Deal lethal damage to hero (no block)
      orchestrator.defend([], 999);

      const result = orchestrator.checkBattleEnd();
      expect(result).toBe('defeat');
    });
  });

  describe('confirmSellOrder', () => {
    it('should transition to defense phase and clear sellPile after confirming sell order', () => {
      const orchestrator = new CombatOrchestrator();
      const runState = createRunState();
      const encounter = createJellyDrifterEncounter();

      orchestrator.startBattle(runState, encounter.enemies, encounter.id, encounter.rewardGold, encounter.rewardCards);

      // Sell a card to create sellPile
      orchestrator.sellCard(0);

      const afterSell = orchestrator.getStateSnapshot();
      expect(afterSell.sellPile!.length).toBe(1);

      // End player turn → sellOrder phase
      orchestrator.endPlayerTurn();
      expect(orchestrator.getStateSnapshot().turnPhase).toBe('sellOrder');

      // Confirm the sell order with the current sellPile ordering
      orchestrator.confirmSellOrder([...afterSell.sellPile!]);

      const afterConfirm = orchestrator.getStateSnapshot();
      expect(afterConfirm.turnPhase).toBe('defense');
      expect(afterConfirm.sellPile).toEqual([]);
    });
  });

  describe('reshuffle', () => {
    it('should reshuffle battleDiscard into battleDeck when deck runs out', () => {
      const orchestrator = new CombatOrchestrator();

      // Use a 4-card deck so all cards are drawn into the opening hand
      const smallDeck = ['fin_slash', 'fin_slash_2', 'ink_cloud', 'bubble_shield'];
      const runState = createRunState({ deck: smallDeck });
      const encounter = createJellyDrifterEncounter();

      orchestrator.startBattle(runState, encounter.enemies, encounter.id, encounter.rewardGold, encounter.rewardCards);

      // After startBattle with a 4-card deck and maxHand=4:
      // All cards are in hand, battleDeck is empty
      let snapshot = orchestrator.getStateSnapshot();
      expect(snapshot.hand!.length).toBe(4);
      expect(orchestrator.deck.battleDeck.length).toBe(0);

      // Sell all cards in hand → they go to sellPile
      const handSize = snapshot.hand!.length;
      for (let i = 0; i < handSize; i++) {
        orchestrator.sellCard(0); // always index 0 since hand shifts
      }

      snapshot = orchestrator.getStateSnapshot();
      expect(snapshot.hand!.length).toBe(0);
      expect(snapshot.sellPile!.length).toBe(4);
      expect(orchestrator.deck.battleDeck.length).toBe(0);

      // End turn → sellOrder (because sellPile is non-empty)
      orchestrator.endPlayerTurn();
      expect(orchestrator.getStateSnapshot().turnPhase).toBe('sellOrder');

      // Confirm sell order → cards go to bottom of battleDeck, then processEndOfTurn
      const soldCards = [...orchestrator.deck.sellPile];
      orchestrator.confirmSellOrder(soldCards);

      // After confirmSellOrder → defense phase, sellPile cleared, cards in battleDeck
      snapshot = orchestrator.getStateSnapshot();
      expect(snapshot.turnPhase).toBe('defense');
      expect(snapshot.sellPile).toEqual([]);
      expect(orchestrator.deck.battleDeck.length).toBeGreaterThan(0);

      // Defend (take some damage)
      orchestrator.defend([], 1);

      // Start next player turn — should draw from battleDeck (which has the re-added cards)
      orchestrator.startPlayerTurn();

      snapshot = orchestrator.getStateSnapshot();
      expect(snapshot.hand!.length).toBeGreaterThan(0);
      expect(snapshot.turnPhase).toBe('play');
    });
  });

  describe('integration: full battle cycle with sell order', () => {
    it('should complete a full battle lifecycle from start to defense phase', () => {
      const orchestrator = new CombatOrchestrator();
      const runState = createRunState();
      const encounter = createJellyDrifterEncounter();

      // Start
      orchestrator.startBattle(runState, encounter.enemies, encounter.id, encounter.rewardGold, encounter.rewardCards);
      expect(orchestrator.checkBattleEnd()).toBeNull();

      // Play an attack card if available
      let snapshot = orchestrator.getStateSnapshot();
      const attack = findFirstAttackCard(snapshot.hand!);
      if (attack) {
        orchestrator.playCard(attack.cardIndex, 0);
      }

      // Sell a card if hand still has cards
      snapshot = orchestrator.getStateSnapshot();
      if (snapshot.hand!.length > 0) {
        orchestrator.sellCard(0);
      }

      // End turn → sellOrder (because we sold a card) or defense
      orchestrator.endPlayerTurn();

      snapshot = orchestrator.getStateSnapshot();
      if (snapshot.turnPhase === 'sellOrder') {
        // Confirm sell order
        orchestrator.confirmSellOrder([...orchestrator.deck.sellPile]);
        snapshot = orchestrator.getStateSnapshot();
      }

      // Should be in defense phase if enemies are alive
      if (orchestrator.checkBattleEnd() === null) {
        expect(snapshot.turnPhase).toBe('defense');

        // Defend
        const defCard = findFirstDefenseCard(snapshot.hand ?? []);
        if (defCard) {
          orchestrator.defend([defCard.cardIndex], 5);
        } else {
          orchestrator.defend([], 5);
        }

        // Check battle end (hero should still be alive after partial damage)
        expect(orchestrator.checkBattleEnd()).toBeNull();
      }
    });
  });
});
