/**
 * Draw and replace system for the tactical combat engine.
 *
 * Pure functions: state-in, state-out. Uses Fisher-Yates shuffle.
 */
import type { CombatState, CombatCard } from './CardTypes';
import { TurnPhase } from './CardTypes';

// ───── Shuffle ─────

/**
 * Fisher-Yates shuffle on a copy of the deck.
 * Uses Math.random() — deterministic only when seed is provided.
 */
export function shuffleDeck(deck: CombatCard[], seed?: number): CombatCard[] {
  const arr = [...deck];

  if (seed !== undefined) {
    // Seeded PRNG (simple LCG) for deterministic shuffles
    let s = seed;
    const next = () => {
      s = (s * 1664525 + 1013904223) & 0xffffffff;
      return (s >>> 0) / 0xffffffff;
    };
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(next() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
  } else {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
  }

  return arr;
}

// ───── Draw ─────

/**
 * Draw `count` cards from the deck into the hand (max hand size is 5).
 * If the deck runs out, shuffle the discard pile into a new deck and continue drawing.
 * Returns a new CombatState.
 */
export function drawCards(state: CombatState, count: number): CombatState {
  let deck = [...state.deck];
  let hand = [...state.hand];
  let discard = [...state.discard];

  for (let i = 0; i < count; i++) {
    if (hand.length >= 5) break;

    if (deck.length === 0) {
      if (discard.length === 0) break;
      deck = shuffleDeck(discard);
      discard = [];
    }

    hand.push(deck[0]);
    deck = deck.slice(1);
  }

  return { ...state, deck, hand, discard };
}

// ───── Replace ─────

/**
 * Remove the card at the given hand index, shuffle it back into the deck,
 * then draw one card. Sets canReplace = false.
 * If the index is out of bounds, returns state unchanged.
 */
export function replaceCardFromHand(state: CombatState, handIndex: number): CombatState {
  if (handIndex < 0 || handIndex >= state.hand.length) return state;

  const hand = [...state.hand];
  const removed = hand.splice(handIndex, 1)[0];

  // Shuffle removed card back into deck
  const deck = shuffleDeck([...state.deck, removed]);

  // Draw one card
  let nextState: CombatState = { ...state, hand, deck, canReplace: false };
  return drawCards(nextState, 1);
}

/**
 * Check if the player can use the replace mechanic this turn.
 * Requires canReplace=true and the PlayerAction phase.
 */
export function canReplace(state: CombatState): boolean {
  return state.canReplace && state.turnPhase === TurnPhase.PlayerAction;
}
