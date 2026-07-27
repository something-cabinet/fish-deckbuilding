import { getCard } from '../cards/cardData';
import {
  HERO_STARTING_HP,
  HERO_MAX_HAND,
  DEFAULT_CREDIT_LIMIT,
  type AIStrategy,
  type EnemyInstance,
  type CombatState,
  type RunState,
} from './CardTypes';

/**
 * Shuffle an array using Fisher-Yates with a seed.
 */
function seededShuffle<T>(arr: T[], seed: number): T[] {
  const result = [...arr];
  let s = seed;
  for (let i = result.length - 1; i > 0; i--) {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    const j = s % (i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Draw cards from deck to fill hand up to maxHand.
 */
export function drawToMaxHand(
  hand: string[],
  deck: string[],
  maxHand: number
): { hand: string[]; deck: string[] } {
  const newHand = [...hand];
  const newDeck = [...deck];
  const toDraw = Math.min(maxHand - newHand.length, newDeck.length);

  for (let i = 0; i < toDraw; i++) {
    const card = newDeck.shift();
    if (card) newHand.push(card);
  }

  return { hand: newHand, deck: newDeck };
}

/**
 * Start a new battle.
 * Shuffles a copy of the run deck and sets up combat state.
 */
export function startBattle(
  runState: RunState,
  encounterEnemies: EnemyInstance[],
  encounterId: string,
  rewardGold: number,
  rewardCards: string[],
  aiStrategy: AIStrategy = 'aggressive'
): CombatState {
  const battleSeed = runState.seed + runState.act * 100 + runState.battleIndex;

  // Shuffle a COPY of the run deck — run deck is NOT modified during combat
  const battleDeck = seededShuffle([...runState.deck], battleSeed);

  // Draw opening hand
  const { hand: openingHand, deck: remainingDeck } = drawToMaxHand(
    [],
    battleDeck,
    runState.heroMaxHand
  );

  return {
    hand: openingHand,
    battleDeck: remainingDeck,
    battleDiscard: [],
    sellPile: [],
    coins: 0,
    creditUsed: 0,
    enemies: encounterEnemies.map(e => ({ ...e })),
    heroHp: runState.heroHp,
    heroMaxHp: runState.heroMaxHp,
    turnPhase: 'draw',
    turnNumber: 1,
    encounterId,
    rewardGold,
    rewardCards: rewardCards || [],
    interestDue: 0,
    incomingDamage: 0,
    enemyActions: [],
    aiStrategy,
  };
}

/**
 * Start a player turn (draw phase → play phase).
 * Draws from battleDeck. Reshuffles discard into deck if battleDeck is empty.
 * Coins reset to 0 at the start of each turn.
 * Interest damage from previous turn's debt is applied to hero.
 */
export function startPlayerTurn(combatState: CombatState): CombatState {
  const maxHand = HERO_MAX_HAND;

  // Reshuffle discard back into deck if we don't have enough cards to draw
  let battleDeck = [...combatState.battleDeck];
  let battleDiscard = [...combatState.battleDiscard];
  const cardsNeeded = maxHand - combatState.hand.length;
  if (cardsNeeded > battleDeck.length && battleDiscard.length > 0) {
    const reshuffled = seededShuffle(battleDiscard, combatState.turnNumber);
    battleDeck = [...battleDeck, ...reshuffled];
    battleDiscard = [];
  }

  // Apply interest damage from previous turn's debt
  let heroHp = combatState.heroHp;
  let interestDue = 0;
  if (combatState.coins < 0) {
    interestDue = Math.abs(combatState.coins);
    heroHp = Math.max(0, heroHp - interestDue);
  }

  // Draw hand up to max hand size from battleDeck
  const { hand: drawnHand, deck: remainingDeck } = drawToMaxHand(
    combatState.hand,
    battleDeck,
    maxHand
  );

  return {
    ...combatState,
    hand: drawnHand,
    battleDeck: remainingDeck,
    battleDiscard,
    coins: 0,               // FaB-style: coins reset to 0 each turn
    creditUsed: 0,
    sellPile: [],
    heroHp,
    interestDue,
    turnPhase: 'play',
  };
}

/**
 * Resolve the turn — advance turn counter and reset per-turn state.
 * Sets phase to 'draw' so the next player turn can start.
 */
export function resolveTurn(combatState: CombatState): CombatState {
  // Check if coins < 0 — interest will be applied in startPlayerTurn
  return {
    ...combatState,
    turnPhase: 'draw',
    turnNumber: combatState.turnNumber + 1,
    sellPile: [],
  };
}

/**
 * Determine if the player's hero is dead.
 */
export function isHeroDead(combatState: CombatState): boolean {
  return combatState.heroHp <= 0;
}

/**
 * Determine if all enemies are dead (victory condition).
 */
export function areAllEnemiesDead(combatState: CombatState): boolean {
  return combatState.enemies.every(e => e.hp <= 0);
}

/**
 * Check if the battle has ended.
 * Returns 'victory' if all enemies are dead, 'defeat' if player hero HP <= 0, null otherwise.
 */
export function checkBattleEnd(combatState: CombatState): 'victory' | 'defeat' | null {
  if (areAllEnemiesDead(combatState)) return 'victory';
  if (isHeroDead(combatState)) return 'defeat';
  return null;
}
