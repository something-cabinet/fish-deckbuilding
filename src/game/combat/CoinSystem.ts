import { getCard } from '../cards/cardData';
import type { CardDef } from './CardTypes';

/**
 * Sell a card from hand: gain coins equal to coinValue.
 * Card is NOT placed in deck — it goes to sellPile for ordering at end of turn.
 * Uses cardIndex for index-based removal (handles duplicate cards).
 */
export function sellCard(
  hand: string[],
  cardIndex: number,
  coins: number,
): { hand: string[]; coins: number } {
  if (cardIndex < 0 || cardIndex >= hand.length) {
    return { hand, coins };
  }

  const cardId = hand[cardIndex];
  const card = getCard(cardId);
  if (!card) return { hand, coins };

  const newHand = [...hand];
  newHand.splice(cardIndex, 1);

  const newCoins = coins + card.coinValue;

  return { hand: newHand, coins: newCoins };
}

/**
 * Check if a card can be played given current coins and credit limit.
 * Returns true if spending coins - cost >= -creditLimit.
 */
export function canPlayCard(card: CardDef | undefined, coins: number, creditLimit: number): boolean {
  if (!card) return false;
  return coins - card.cost >= -creditLimit;
}

/**
 * Spend coins. Returns new coin value (can go negative within credit limit).
 */
export function spendCoins(coins: number, cost: number): number {
  return coins - cost;
}

/**
 * Calculate interest: how much is owed when coins are negative.
 * Returns |coins| if coins < 0, otherwise 0.
 */
export function calculateInterest(coins: number): number {
  return coins < 0 ? Math.abs(coins) : 0;
}

/**
 * Check if the player can afford a card with credit.
 * Returns: (coins - cost) >= -creditLimit
 */
export function canAffordWithCredit(coins: number, cost: number, creditLimit: number): boolean {
  return coins - cost >= -creditLimit;
}
