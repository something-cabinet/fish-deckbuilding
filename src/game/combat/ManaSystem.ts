/**
 * Mana system for the tactical combat engine.
 *
 * Mana increases by 1 each turn (capped at 9).
 * Pure functions: state-in, state-out.
 */
import type { CombatState } from './CardTypes';
import { TurnPhase } from './CardTypes';

/**
 * Get the maximum mana available for a given turn number.
 * Formula: min(turnNumber, 9), so turn 1 = 1, turn 2 = 2, ..., turn 9+ = 9.
 */
export function getManaForTurn(turnNumber: number): number {
  return Math.min(turnNumber, 9);
}

/**
 * Check if the player can afford to play a card with the given mana cost.
 * Returns true only if player has enough mana AND it's the PlayerAction phase.
 */
export function canPlayCard(state: CombatState, manaCost: number): boolean {
  return state.mana >= manaCost && state.turnPhase === TurnPhase.PlayerAction;
}

/**
 * Deduct mana from the current pool.
 * If the amount exceeds available mana, returns the state unchanged.
 */
export function spendMana(state: CombatState, amount: number): CombatState {
  if (amount > state.mana) return state;
  return { ...state, mana: state.mana - amount };
}
