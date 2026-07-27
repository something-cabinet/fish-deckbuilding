/**
 * Combat Orchestrator — ECS-based combat flow coordinator.
 *
 * Owns combat entities (hero, enemies) and orchestrates the turn-based flow.
 * Contains action methods called by the bridge/UI layer.
 * Emits events via eventBus for Svelte bridge to consume.
 *
 * The pure function modules (CoinSystem, TurnFlow, Keywords, Effects, EnemyAI, RelicSystem)
 * handle the actual game logic; this orchestrator coordinates them using Excalibur ECS state.
 */

import { Actor } from 'excalibur';
import { getCard } from '../cards/cardData';
import { getRelic } from '../relics/relicData';
import { sellCard, spendCoins, canPlayCard, calculateInterest } from '../combat/CoinSystem';
import { drawToMaxHand, startBattle as turnFlowStartBattle } from '../combat/TurnFlow';
import { computeEnemyActions } from '../combat/EnemyAI';
import { resolveKeywords } from '../combat/Keywords';
import type { KeywordContext } from '../combat/Keywords';
import { resolveEffects } from '../combat/Effects';
import type { EffectContext } from '../combat/Effects';
import { resolveRelicTrigger } from '../combat/RelicSystem';
import type { RelicTrigger } from '../combat/RelicSystem';
import { DEFAULT_CREDIT_LIMIT, HERO_MAX_HAND } from '../combat/CardTypes';
import type {
  CombatState, EnemyInstance, RunState, AIStrategy,
  TurnPhase, EnemyAction,
} from '../combat/CardTypes';
import type { EnemyAttackEvent } from '../events';

import {
  HealthComponent,
  CoinComponent,
  TurnComponent,
  DeckStateComponent,
  EnemyTagComponent,
  RelicComponent,
  RewardComponent,
} from '../components';
import { eventBus } from '../events';
import { createHeroEntity, createEnemyEntity } from '../entities';

export class CombatOrchestrator {
  /** The hero entity (alive for the duration of one battle). */
  hero: Actor;
  /** Enemy entities (one per alive enemy). */
  enemies: Actor[] = [];
  /** All entities for this battle. */
  entities: Actor[] = [];
  /** Guard against re-emitting battle-end events. */
  private _battleOver: boolean = false;
  /** AI strategy for this encounter. */
  private aiStrategy: AIStrategy = 'aggressive';

  constructor() {
    this.hero = createHeroEntity();
    this.entities.push(this.hero);
  }

  /**
   * Emit a full state snapshot for the bridge to sync.
   * Call after every action that changes combat state.
   */
  private emitStateSnapshot(): void {
    eventBus.emit('state:changed', {});
  }

  /**
   * Build a partial CombatState snapshot from ECS components for the bridge.
   */
  getStateSnapshot(): Partial<CombatState> {
    // Map enemy HP from HealthComponent into fresh EnemyInstance-like objects
    const enemies = this.enemies.map(e => {
      const tag = e.get(EnemyTagComponent)!;
      const hp = e.get(HealthComponent)!.current;
      return { ...tag.def, hp };
    });

    return {
      hand: [...this.deck.hand],
      battleDeck: [...this.deck.battleDeck],
      battleDiscard: [...this.deck.battleDiscard],
      sellPile: [...this.deck.sellPile],
      coins: this.coins.coins,
      creditUsed: this.coins.creditUsed,
      heroHp: this.health.current,
      heroMaxHp: this.health.max,
      turnPhase: this.turn.phase,
      turnNumber: this.turn.turnNumber,
      enemies,
    };
  }

  // ───── Entity Accessors ─────

  get health(): HealthComponent { return this.hero.get(HealthComponent)!; }
  get coins(): CoinComponent { return this.hero.get(CoinComponent)!; }
  get turn(): TurnComponent { return this.hero.get(TurnComponent)!; }
  get deck(): DeckStateComponent { return this.hero.get(DeckStateComponent)!; }
  get relics(): RelicComponent { return this.hero.get(RelicComponent)!; }
  get reward(): RewardComponent { return this.hero.get(RewardComponent)!; }

  private getAliveEnemies(): Actor[] {
    return this.enemies.filter(e => {
      const h = e.get(HealthComponent);
      return h && h.current > 0;
    });
  }

  private getEnemyDef(actor: Actor): EnemyInstance {
    return actor.get(EnemyTagComponent)!.def;
  }

  // ───── Battle Lifecycle ─────

  /**
   * Start a battle. Sets up the hero from run state, creates enemy entities,
   * shuffles deck, draws opening hand.
   */
  startBattle(runState: RunState, encounterEnemies: EnemyInstance[], encounterId: string, rewardGold: number, rewardCards: string[], aiStrategy?: AIStrategy): void {
    // Apply run state to hero
    this.aiStrategy = aiStrategy ?? 'aggressive';
    this.health.current = runState.heroHp;
    this.health.max = runState.heroMaxHp;
    this.relics.relicIds = [...runState.relics];
    this.reward.encounterId = encounterId;
    this.reward.rewardGold = rewardGold;
    this.reward.rewardCards = rewardCards || [];
    this.coins.creditLimit = runState.creditLimit ?? DEFAULT_CREDIT_LIMIT;

    // Create enemy entities
    this.enemies = encounterEnemies.map((e, i) => {
      const x = 300 + i * 120;
      const y = 150;
      return createEnemyEntity(e, i, x, y);
    });
    this.entities = [this.hero, ...this.enemies];

    // Start battle — use pure function for deck shuffle + hand draw
    const combatState: CombatState = {
      hand: [],
      battleDeck: [...runState.deck],
      battleDiscard: [],
      sellPile: [],
      coins: 0,
      creditUsed: 0,
      enemies: encounterEnemies,
      heroHp: runState.heroHp,
      heroMaxHp: runState.heroMaxHp,
      turnPhase: 'draw',
      turnNumber: 1,
      encounterId,
      rewardGold,
      rewardCards: rewardCards || [],
      interestDue: 0,
      enemyActions: [],
      aiStrategy: 'aggressive',
    };

    const started = turnFlowStartBattle(runState, encounterEnemies, encounterId, rewardGold, rewardCards);

    // Sync pure function result to ECS components
    this.deck.hand = started.hand;
    this.deck.battleDeck = started.battleDeck;
    this.deck.battleDiscard = [];
    this.deck.sellPile = [];
    this.coins.coins = 0;
    this.coins.creditUsed = 0;
    this.turn.phase = 'draw';
    this.turn.turnNumber = 1;

    // Fire onCombatStart relic effects
    this.applyRelicTrigger('onCombatStart');

    eventBus.emit('combat:started', {
      encounterId,
      hand: [...this.deck.hand],
      enemies: this.enemies.length,
    });

    // Auto-start first player turn
    this.startPlayerTurn();
  }

  // ───── Turn Flow ─────

  /**
   * Start the player's turn — draw cards, reset coins, apply interest.
   */
  startPlayerTurn(): void {
    const coinsComp = this.coins;
    const deckComp = this.deck;
    const healthComp = this.health;
    const turnComp = this.turn;

    // Apply interest from previous turn's debt
    let heroHp = healthComp.current;
    let interestDue = 0;
    if (coinsComp.coins < 0) {
      interestDue = Math.abs(coinsComp.coins);
      heroHp = Math.max(0, heroHp - interestDue);
    }

    // Reshuffle discard if needed
    let battleDeck = [...deckComp.battleDeck];
    let battleDiscard = [...deckComp.battleDiscard];
    const maxHand = 4;
    const cardsNeeded = maxHand - deckComp.hand.length;
    if (cardsNeeded > battleDeck.length && battleDiscard.length > 0) {
      const reshuffled = [...battleDiscard].sort(() => Math.random() - 0.5);
      battleDeck = [...battleDeck, ...reshuffled];
      battleDiscard = [];
    }

    // Draw
    const { hand: drawnHand, deck: remainingDeck } = drawToMaxHand(
      deckComp.hand, battleDeck, maxHand,
    );

    deckComp.hand = drawnHand;
    deckComp.battleDeck = remainingDeck;
    deckComp.battleDiscard = battleDiscard;
    deckComp.sellPile = [];
    coinsComp.coins = 0;
    coinsComp.creditUsed = 0;
    healthComp.current = heroHp;
    turnComp.phase = 'play';

    this.emitStateSnapshot();

    eventBus.emit('turn:started', {
      turnNumber: turnComp.turnNumber,
      hand: [...deckComp.hand],
      coins: 0,
      heroHp,
    });

    if (interestDue > 0) {
      eventBus.emit('interest:due', { amount: interestDue, heroHp });
    }

    // Relic: onTurnStart
    this.applyRelicTrigger('onTurnStart');
  }

  /**
   * End the player turn. If sellPile has cards, transitions to sellOrder phase.
   * Otherwise processes end-of-turn (interest, enemy actions, defense phase).
   */
  endPlayerTurn(): void {
    const deckComp = this.deck;

    if (deckComp.sellPile.length > 0) {
      this.turn.phase = 'sellOrder';
      this.emitStateSnapshot();
      return;
    }

    this.processEndOfTurn();
  }

  /**
   * Confirm the sell order after the player reorders sold cards.
   */
  confirmSellOrder(orderedCards: string[]): void {
    const deckComp = this.deck;
    deckComp.battleDeck = [...deckComp.battleDeck, ...orderedCards];
    deckComp.sellPile = [];
    this.processEndOfTurn();
  }

  /**
   * Process interest, enemy actions, transition to defense phase.
   */
  private processEndOfTurn(): void {
    const healthComp = this.health;
    const coinsComp = this.coins;

    // Check battle end first
    if (this._battleOver) return;
    const battleEnd = this.checkBattleEnd();
    if (battleEnd) return;

    // Interest
    const interest = calculateInterest(coinsComp.coins);
    if (interest > 0) {
      healthComp.current = Math.max(0, healthComp.current - interest);
      eventBus.emit('interest:due', { amount: interest, heroHp: healthComp.current });
    }

    // Hero dead from interest
    if (healthComp.current <= 0 && !this._battleOver) {
      this.checkBattleEnd();
      return;
    }

    // No living enemies — skip defense, resolve turn
    const alive = this.getAliveEnemies();
    if (alive.length === 0 && !this._battleOver) {
      coinsComp.coins = 0;
      coinsComp.creditUsed = 0;
      this.checkBattleEnd();
      return;
    }

    // Compute enemy AI actions using the encounter's AI strategy
    const strategy = this.aiStrategy;
    // Only consider alive enemies, but preserve their original indices for correct mapping
    const aliveWithIndices = this.enemies
      .map((e, i) => ({ actor: e, index: i }))
      .filter(({ actor }) => {
        const h = actor.get(HealthComponent);
        return h && h.current > 0;
      });

    const enemyActions = computeEnemyActions(
      aliveWithIndices.map(({ actor }) => this.getEnemyDef(actor)),
      strategy,
    );

    // Map back to full enemy array indices
    const attackEvents = enemyActions
      .filter(a => a.type === 'attack')
      .map(a => ({
        enemyId: this.getEnemyDef(this.enemies[aliveWithIndices[a.enemyIndex].index]).id,
        damage: a.damage ?? 0,
      }));
    const incomingDamage = attackEvents.reduce((sum, a) => sum + a.damage, 0);

    coinsComp.coins = 0;
    coinsComp.creditUsed = 0;

    // Advance turn counter for the next player turn
    this.turn.turnNumber += 1;

    // Defense phase
    this.turn.phase = 'defense';

    this.emitStateSnapshot();

    eventBus.emit('combat:defensePhase', {
      incomingDamage,
      enemyAttacks: attackEvents,
    });
  }

  // ───── Player Actions ─────

  /**
   * Sell a card from hand for coins.
   */
  sellCard(cardIndex: number): void {
    const deckComp = this.deck;
    const coinsComp = this.coins;

    if (cardIndex < 0 || cardIndex >= deckComp.hand.length) return;

    const cardId = deckComp.hand[cardIndex];
    const result = sellCard(deckComp.hand, cardIndex, coinsComp.coins);

    deckComp.hand = result.hand;
    coinsComp.coins = result.coins;
    deckComp.sellPile = [...deckComp.sellPile, cardId];

    this.emitStateSnapshot();

    eventBus.emit('card:sold', {
      cardId,
      cardIndex,
      coins: result.coins,
      sellPile: [...deckComp.sellPile],
    });
  }

  /**
   * Play an attack card against a specific enemy.
   */
  playCard(cardIndex: number, targetEnemyIndex: number): void {
    const deckComp = this.deck;
    const coinsComp = this.coins;
    const healthComp = this.health;

    if (cardIndex < 0 || cardIndex >= deckComp.hand.length) return;
    if (targetEnemyIndex < 0 || targetEnemyIndex >= this.enemies.length) return;

    const cardId = deckComp.hand[cardIndex];
    const card = getCard(cardId);
    if (!card || card.attack <= 0) return;

    const targetEnemy = this.enemies[targetEnemyIndex];
    const targetHealth = targetEnemy.get(HealthComponent);
    if (!targetHealth || targetHealth.current <= 0) return;

    // Resolve keywords
    const kwContext: KeywordContext = {
      card,
      heroHp: healthComp.current,
      heroMaxHp: healthComp.max,
      coins: coinsComp.coins,
      creditLimit: DEFAULT_CREDIT_LIMIT,
      handSize: deckComp.hand.length,
    };
    const kwResult = resolveKeywords(card, kwContext);

    const effectiveCreditLimit = kwResult.overdraft
      ? DEFAULT_CREDIT_LIMIT * 2
      : DEFAULT_CREDIT_LIMIT;

    if (!canPlayCard(card, coinsComp.coins, effectiveCreditLimit)) return;

    // Spend coins
    const newCoins = spendCoins(coinsComp.coins, card.cost);
    const creditUsed = newCoins < 0 ? Math.abs(newCoins) : 0;

    // Remove card from hand → battleDiscard
    const newHand = [...deckComp.hand];
    newHand.splice(cardIndex, 1);
    const newBattleDiscard = [...deckComp.battleDiscard, cardId];

    // Calculate damage
    const baseDamage = card.attack;
    const bonusDamage = kwResult.bonusDamage ?? 0;
    const totalDamage = baseDamage + bonusDamage;
    const enemyDef = targetEnemy.get(EnemyTagComponent)?.def;
    const enemyDefense = kwResult.pierce ? 0 : (enemyDef?.defense ?? 0);
    const effectiveDamage = Math.max(0, totalDamage - enemyDefense);

    // Apply damage to enemy
    targetHealth.current = Math.max(0, targetHealth.current - effectiveDamage);

    // Resolve effects
    const effectContext: EffectContext = {
      heroHp: healthComp.current,
      heroMaxHp: healthComp.max,
      coins: newCoins,
      handSize: newHand.length,
      deckSize: deckComp.battleDeck.length,
      enemiesAlive: this.getAliveEnemies().length,
    };
    const effResult = resolveEffects(card.effects ?? [], effectContext);

    // Apply supplementary effects
    const cardHeal = effResult.healHero;
    const lifestealHeal = kwResult.healAmount ?? 0;
    const totalHeal = cardHeal + lifestealHeal;
    const finalHp = Math.min(healthComp.max, healthComp.current + totalHeal);
    const finalCoins = newCoins + effResult.coinsGained;

    // Draw cards
    let afterHand = [...newHand];
    let afterDeck = [...deckComp.battleDeck];
    for (let i = 0; i < effResult.drawCards && afterDeck.length > 0; i++) {
      const drawn = afterDeck.shift()!;
      afterHand.push(drawn);
    }

    // Update components
    deckComp.hand = afterHand;
    deckComp.battleDeck = afterDeck;
    deckComp.battleDiscard = newBattleDiscard;
    coinsComp.coins = finalCoins;
    coinsComp.creditUsed = Math.max(coinsComp.creditUsed, creditUsed);
    healthComp.current = finalHp;

    this.emitStateSnapshot();

    eventBus.emit('card:played', {
      cardId,
      cardIndex,
      targetEnemyIndex,
      damage: effectiveDamage,
      coins: finalCoins,
    });

    // Check if enemy died
    if (targetHealth.current <= 0) {
      const enemyTag = targetEnemy.get(EnemyTagComponent);
      eventBus.emit('enemy:killed', {
        enemyIndex: targetEnemyIndex,
        enemyId: enemyTag?.def.id ?? '',
      });
    } else {
      // Emit enemy:hurt so bridge syncs HP visually
      eventBus.emit('enemy:hurt', {
        enemyIndex: targetEnemyIndex,
        damage: effectiveDamage,
        remainingHp: targetHealth.current,
      });
    }

    // Check battle end immediately after attack
    if (!this._battleOver) {
      this.checkBattleEnd();
    }

    // Relic: onCardPlayed
    this.applyRelicTrigger('onCardPlayed');
  }

  /**
   * Defend: select cards from hand to block enemy attacks.
   * @param blockedCardIndices Indices of cards in hand to use for blocking
   * @param incomingDamage Total damage from enemy attacks this turn
   */
  defend(blockedCardIndices: number[], incomingDamage: number): void {
    const deckComp = this.deck;
    const healthComp = this.health;

    // Calculate block
    let totalBlock = 0;
    const sorted = [...blockedCardIndices].sort((a, b) => b - a);
    const newHand = [...deckComp.hand];
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

    // Apply damage reduction from relics (Golden Scales)
    // handled in the bridge before calling this method

    healthComp.current = Math.max(0, healthComp.current - Math.max(0, incomingDamage - totalBlock));
    deckComp.hand = newHand;
    deckComp.battleDiscard = [...deckComp.battleDiscard, ...blockedCardIds];

    this.emitStateSnapshot();

    eventBus.emit('card:blocked', {
      blockedCardIds,
      blockedEnemyDamage: totalBlock,
      heroHp: healthComp.current,
    });
  }

  // ───── Relic System ─────

  applyRelicTrigger(trigger: RelicTrigger, randomRoll?: number): void {
    const relicsComp = this.relics;
    const coinsComp = this.coins;
    const healthComp = this.health;
    const deckComp = this.deck;

    if (relicsComp.relicIds.length === 0) return;

    const relics = relicsComp.relicIds
      .map(id => getRelic(id))
      .filter((r): r is NonNullable<typeof r> => r != null);

    if (relics.length === 0) return;

    const effects = resolveRelicTrigger(trigger, relics, randomRoll);
    if (effects.length === 0) return;

    for (const effect of effects) {
      switch (effect.type) {
        case 'gainCoins':
          coinsComp.coins += effect.value;
          break;
        case 'heal':
          healthComp.current = Math.min(healthComp.max, healthComp.current + effect.value);
          break;
        case 'draw': {
          const drawn = deckComp.battleDeck.slice(0, effect.value);
          deckComp.hand = [...deckComp.hand, ...drawn];
          deckComp.battleDeck = deckComp.battleDeck.slice(effect.value);
          break;
        }
      }
    }
  }

  // ───── Battle End ─────

  /**
   * Check battle end conditions. Returns 'victory', 'defeat', or null if battle continues.
   * Emits corresponding events to notify the bridge layer.
   */
  checkBattleEnd(): 'victory' | 'defeat' | null {
    const healthComp = this.health;

    // Hero dead
    if (healthComp.current <= 0) {
      eventBus.emit('combat:defeat', {});
      return 'defeat';
    }

    // All enemies dead
    const alive = this.getAliveEnemies();
    if (alive.length === 0) {
      eventBus.emit('combat:victory', {
        rewardGold: this.reward.rewardGold,
        rewardCards: [...this.reward.rewardCards],
      });
      return 'victory';
    }

    return null;
  }

  // ───── Cleanup ─────

  /**
   * Clean up entities for this battle.
   */
  destroy(): void {
    for (const entity of this.entities) {
      entity.kill();
    }
    this.enemies = [];
    this.entities = [];
  }
}
