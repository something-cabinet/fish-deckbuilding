import { getCard } from '../cards/cardData';
import type { EncounterDef } from '../enemies/encounterData';
import { sellCard, spendCoins, canPlayCard, calculateInterest } from './CoinSystem';
import { computeEnemyActions } from './EnemyAI';
import {
  drawToMaxHand,
  startBattle as turnFlowStartBattle,
  startPlayerTurn,
  resolveTurn,
  checkBattleEnd as turnFlowCheckBattleEnd,
} from './TurnFlow';
import { resolveKeywords } from './Keywords';
import type { KeywordContext } from './Keywords';
import { resolveEffects } from './Effects';
import type { EffectContext } from './Effects';
import { resolveRelicTrigger, resolveDamageReduction } from './RelicSystem';
import type { RelicDef, RelicTrigger } from './RelicSystem';
import { getRelic } from '../relics/relicData';
import {
  DEFAULT_CREDIT_LIMIT,
  type CombatState,
  type RunState,
  type CardEffect,
} from './CardTypes';

export interface CombatController {
  startBattle(runState: RunState, encounter: EncounterDef): CombatState;
  sellCard(combatState: CombatState, cardIndex: number): CombatState;
  playAttack(combatState: CombatState, cardIndex: number, targetEnemyIndex: number): CombatState;
  endPlayerTurn(combatState: CombatState): EnemyTurnResult;
  confirmSellOrder(combatState: CombatState, orderedCards: string[]): EnemyTurnResult;
  defend(combatState: CombatState, blockedCardIndices: number[]): CombatState;
  resolveTurn(combatState: CombatState): CombatState;
  checkBattleEnd(combatState: CombatState): 'victory' | 'defeat' | null;
  /** Apply relic effects for a given trigger, returning updated state */
  applyRelicTrigger(combatState: CombatState, relicIds: string[], trigger: RelicTrigger, randomRoll?: number): CombatState;
  /** Apply damage reduction from relics (Golden Scales) */
  applyDamageReduction(combatState: CombatState, relicIds: string[], incomingDamage: number): { state: CombatState; reducedDamage: number };
}

export interface EnemyTurnResult {
  combatState: CombatState;
  incomingDamage: number;
  enemyAttacks: { enemyId: string; damage: number }[];
  requiresDefense: boolean;
}

/**
 * Process the end-of-turn logic: interest, enemy attacks, defense transition.
 * Shared between endPlayerTurn (when sellPile is empty) and confirmSellOrder (after sellPile flushed).
 */
function processEndOfTurn(combatState: CombatState): EnemyTurnResult {
  // Check if battle ended
  const battleEnd = turnFlowCheckBattleEnd(combatState);
  if (battleEnd) {
    return {
      combatState,
      incomingDamage: 0,
      enemyAttacks: [],
      requiresDefense: false,
    };
  }

  // Calculate interest on debt (negative coins)
  const interest = calculateInterest(combatState.coins);

  // Compute AI actions for all alive enemies
  const enemyActions = computeEnemyActions(combatState.enemies, combatState.aiStrategy);

  // Sum damage from all attacking enemies
  const attackActions = enemyActions.filter(a => a.type === 'attack');
  const enemyAttacks = attackActions.map(a => ({
    enemyId: combatState.enemies[a.enemyIndex].id,
    damage: a.damage ?? 0,
  }));
  const totalDamageFromEnemies = attackActions.reduce((sum, a) => sum + (a.damage ?? 0), 0);
  const totalDamage = totalDamageFromEnemies + interest;

  // Apply interest damage directly to hero
  let heroHp = combatState.heroHp;
  if (interest > 0) {
    heroHp = Math.max(0, heroHp - interest);
  }

  // Hero dies from interest
  if (heroHp <= 0) {
    return {
      combatState: {
        ...combatState,
        coins: 0,
        heroHp: 0,
        turnPhase: 'resolve',
        enemyActions,
      },
      incomingDamage: totalDamage,
      enemyAttacks,
      requiresDefense: false,
    };
  }

  // No living enemies — skip defense phase
  if (combatState.enemies.filter(e => e.hp > 0).length === 0) {
    const resolved = resolveTurn({
      ...combatState,
      coins: 0,
      creditUsed: 0,
      heroHp,
      turnPhase: 'resolve',
      enemyActions,
    });
    return {
      combatState: resolved,
      incomingDamage: 0,
      enemyAttacks: [],
      requiresDefense: false,
    };
  }

  // Transition to defense phase so player can block
  const state: CombatState = {
    ...combatState,
    coins: 0,
    creditUsed: 0,
    heroHp,
    turnPhase: 'defense',
    enemyActions,
  };

  return {
    combatState: state,
    incomingDamage: totalDamage,
    enemyAttacks,
    requiresDefense: true,
  };
}

/**
 * Pure combat state machine.
 * Each function takes state in, returns new state out. No side effects.
 */
export const CombatController: CombatController = {
  /**
   * Start a battle from a run state and encounter definition.
   */
  startBattle(runState: RunState, encounter: EncounterDef): CombatState {
    return turnFlowStartBattle(
      runState,
      encounter.enemies,
      encounter.id,
      encounter.rewardGold,
      encounter.rewardCards || [],
      encounter.aiStrategy
    );
  },

  /**
   * Sell a card from hand for coins.
   * Card goes to sellPile (pending) instead of directly to battleDeck.
   */
  sellCard(combatState: CombatState, cardIndex: number): CombatState {
    if (cardIndex < 0 || cardIndex >= combatState.hand.length) return combatState;

    const result = sellCard(
      combatState.hand,
      cardIndex,
      combatState.coins
    );

    return {
      ...combatState,
      hand: result.hand,
      coins: result.coins,
      sellPile: [...combatState.sellPile, combatState.hand[cardIndex]],
    };
  },

  /**
   * Play an attack card against a specific enemy target.
   * 1. Verify card is affordable (coins - cost >= -effectiveCreditLimit)
   * 2. Spend coins
   * 3. Remove card from hand -> battleDiscard
   * 4. Resolve keywords (double_strike, lifesteal, pierce)
   * 5. Resolve card effects (draw, heal, gainCoins)
   * 6. Apply damage to target enemy (with pierce bypassing defense)
   * 7. Apply supplementary effects
   */
  playAttack(
    combatState: CombatState,
    cardIndex: number,
    targetEnemyIndex: number
  ): CombatState {
    if (cardIndex < 0 || cardIndex >= combatState.hand.length) return combatState;

    const cardId = combatState.hand[cardIndex];
    const card = getCard(cardId);
    if (!card) return combatState;
    if (card.attack <= 0) return combatState; // Only attack cards can be played as attacks

    // Resolve keywords for affordability check (overdraft bypass)
    const kwContext: KeywordContext = {
      card,
      heroHp: combatState.heroHp,
      heroMaxHp: combatState.heroMaxHp,
      coins: combatState.coins,
      creditLimit: DEFAULT_CREDIT_LIMIT,
      handSize: combatState.hand.length,
    };
    const kwResult = resolveKeywords(card, kwContext);

    // Overdraft keyword doubles the effective credit limit
    const effectiveCreditLimit = kwResult.overdraft
      ? DEFAULT_CREDIT_LIMIT * 2
      : DEFAULT_CREDIT_LIMIT;

    // Verify we can afford it
    if (!canPlayCard(card, combatState.coins, effectiveCreditLimit)) return combatState;

    // Verify the target enemy exists and is alive
    const targetEnemy = combatState.enemies[targetEnemyIndex];
    if (!targetEnemy || targetEnemy.hp <= 0) return combatState;

    // 1. Spend coins
    const newCoins = spendCoins(combatState.coins, card.cost);

    // Track credit used for interest calculation
    const creditUsed = newCoins < 0 ? Math.abs(newCoins) : 0;

    // 2. Remove card from hand, add to battleDiscard
    const newHand = [...combatState.hand];
    newHand.splice(cardIndex, 1);
    const newBattleDiscard = [...combatState.battleDiscard, cardId];

    // 3. Calculate damage with keyword modifiers
    const baseDamage = card.attack;
    const bonusDamage = kwResult.bonusDamage ?? 0;
    const totalDamage = baseDamage + bonusDamage;

    // 4. Apply damage to enemy (pierce ignores enemy defense)
    const enemyDefense = kwResult.pierce ? 0 : (targetEnemy.defense || 0);
    const effectiveDamage = Math.max(0, totalDamage - enemyDefense);

    const newEnemies = combatState.enemies.map((e, i) => {
      if (i === targetEnemyIndex) {
        return { ...e, hp: Math.max(0, e.hp - effectiveDamage) };
      }
      return e;
    });

    // 5. Resolve card effects
    const effectContext: EffectContext = {
      heroHp: combatState.heroHp,
      heroMaxHp: combatState.heroMaxHp,
      coins: newCoins,
      handSize: newHand.length,
      deckSize: combatState.battleDeck.length,
      enemiesAlive: newEnemies.filter(e => e.hp > 0).length,
    };
    const effResult = resolveEffects(card.effects ?? [], effectContext);

    // 6. Apply supplementary effects
    // Heal from card effects + lifesteal
    const cardHeal = effResult.healHero;
    const lifestealHeal = kwResult.healAmount ?? 0;
    const totalHeal = cardHeal + lifestealHeal;
    const finalHp = Math.min(combatState.heroMaxHp, combatState.heroHp + totalHeal);

    // Coins from card effects
    const finalCoins = newCoins + effResult.coinsGained;

    // Draw cards from battleDeck
    let afterHand = [...newHand];
    let afterDeck = [...combatState.battleDeck];
    for (let i = 0; i < effResult.drawCards && afterDeck.length > 0; i++) {
      const drawn = afterDeck.shift()!;
      afterHand.push(drawn);
    }

    return {
      ...combatState,
      hand: afterHand,
      battleDeck: afterDeck,
      battleDiscard: newBattleDiscard,
      coins: finalCoins,
      creditUsed: Math.max(combatState.creditUsed, creditUsed),
      enemies: newEnemies,
      heroHp: finalHp,
    };
  },

  /**
   * End the player turn:
   * 1. If sellPile has cards → defer to sellOrder phase for reordering
   * 2. Otherwise → process interest, enemy attacks normally
   */
  endPlayerTurn(combatState: CombatState): EnemyTurnResult {
    // Check if battle ended
    const battleEnd = turnFlowCheckBattleEnd(combatState);
    if (battleEnd) {
      return {
        combatState,
        incomingDamage: 0,
        enemyAttacks: [],
        requiresDefense: false,
      };
    }

    // If sellPile has cards, prompt player to order them before end-of-turn processing
    if (combatState.sellPile.length > 0) {
      return {
        combatState: {
          ...combatState,
          turnPhase: 'sellOrder',
        },
        incomingDamage: 0,
        enemyAttacks: [],
        requiresDefense: false,
      };
    }

    // No sellPile — proceed with full end-of-turn processing
    return processEndOfTurn(combatState);
  },

  /**
   * Confirm the sell order after player rearranges them.
   */
  confirmSellOrder(combatState: CombatState, orderedCards: string[]): EnemyTurnResult {
    // Append ordered cards to bottom of battleDeck
    const newBattleDeck = [...combatState.battleDeck, ...orderedCards];

    const state: CombatState = {
      ...combatState,
      battleDeck: newBattleDeck,
      sellPile: [],
    };

    // Proceed with full end-of-turn processing
    return processEndOfTurn(state);
  },

  /**
   * Defend: select cards from hand to block enemy attacks.
   * Blocked cards go to battleDiscard.
   * Damage is mitigated by defense values.
   */
  defend(combatState: CombatState, blockedCardIndices: number[]): CombatState {
    // Calculate total block value
    let totalBlock = 0;
    const sorted = [...blockedCardIndices].sort((a, b) => b - a);
    const newHand = [...combatState.hand];
    const blockedCardIds: string[] = [];

    for (const idx of sorted) {
      if (idx >= 0 && idx < newHand.length) {
        const cardId = newHand[idx];
        const card = getCard(cardId);
        if (card) {
          totalBlock += card.defense;
          blockedCardIds.push(cardId);
          newHand.splice(idx, 1);
        }
      }
    }

    // Calculate incoming damage from enemy actions (only attacking enemies)
    const incomingDamage = combatState.enemyActions
      .filter(a => a.type === 'attack')
      .reduce((sum, a) => sum + (a.damage ?? 0), 0);

    // Mitigate damage
    const mitigated = Math.max(0, incomingDamage - totalBlock);

    // Apply remaining damage to hero
    const heroHp = Math.max(0, combatState.heroHp - mitigated);

    // Move blocked cards to battleDiscard
    const newBattleDiscard = [...combatState.battleDiscard, ...blockedCardIds];

    return {
      ...combatState,
      hand: newHand,
      battleDiscard: newBattleDiscard,
      heroHp,
    };
  },

  /**
   * Resolve the turn: move remaining hand to deck bottom, advance turn counter.
   */
  resolveTurn(combatState: CombatState): CombatState {
    // Move remaining hand cards to bottom of battleDeck
    let newBattleDeck = [...combatState.battleDeck];
    if (combatState.hand.length > 0) {
      newBattleDeck = [...newBattleDeck, ...combatState.hand];
    }

    const resolved = resolveTurn({
      ...combatState,
      hand: [],
      battleDeck: newBattleDeck,
    });

    return resolved;
  },

  /**
   * Check if the battle has ended.
   */
  checkBattleEnd(combatState: CombatState): 'victory' | 'defeat' | null {
    return turnFlowCheckBattleEnd(combatState);
  },

  /**
   * Apply relic effects for a given trigger.
   * Returns the updated combat state with relic effects applied.
   */
  applyRelicTrigger(
    combatState: CombatState,
    relicIds: string[],
    trigger: RelicTrigger,
    randomRoll?: number,
  ): CombatState {
    // Resolve relic IDs to RelicDef objects
    const relics: RelicDef[] = [];
    for (const id of relicIds) {
      const relic = getRelic(id);
      if (relic) relics.push(relic);
    }

    if (relics.length === 0) return combatState;

    const effects = resolveRelicTrigger(trigger, relics, randomRoll);
    if (effects.length === 0) return combatState;

    let { coins, heroHp, hand, battleDeck } = combatState;

    for (const effect of effects) {
      switch (effect.type) {
        case 'gainCoins':
          coins += effect.value;
          break;
        case 'heal':
          heroHp = Math.min(combatState.heroMaxHp, heroHp + effect.value);
          break;
        case 'draw': {
          const drawn = battleDeck.slice(0, effect.value);
          hand = [...hand, ...drawn];
          battleDeck = battleDeck.slice(effect.value);
          break;
        }
      }
    }

    return {
      ...combatState,
      coins,
      heroHp,
      hand,
      battleDeck,
    };
  },

  /**
   * Apply damage reduction from relics (e.g., Golden Scales).
   * Returns the updated state and the amount of damage reduced.
   */
  applyDamageReduction(
    combatState: CombatState,
    relicIds: string[],
    incomingDamage: number,
  ): { state: CombatState; reducedDamage: number } {
    const relics: RelicDef[] = [];
    for (const id of relicIds) {
      const relic = getRelic(id);
      if (relic) relics.push(relic);
    }

    if (relics.length === 0 || incomingDamage <= 0) {
      return { state: combatState, reducedDamage: 0 };
    }

    const reduction = resolveDamageReduction(relics, incomingDamage);
    if (reduction <= 0) {
      return { state: combatState, reducedDamage: 0 };
    }

    return {
      state: combatState, // Damage reduction is applied during the defense phase
      reducedDamage: reduction,
    };
  },
};
