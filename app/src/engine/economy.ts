import { COIN_START, CREDIT_LIMIT, FORECLOSURE_TURN, INTEREST_START_TURN } from './contract';

/** Whether a purchase of `cost` is affordable, allowing borrowing to CREDIT_LIMIT. */
export function canAfford(cost: number, coins: number): boolean {
  return coins - cost >= CREDIT_LIMIT;
}

/** End-of-turn debt interest: |coins| when negative, else 0. */
export function debtInterest(coins: number): number {
  return coins < 0 ? Math.abs(coins) : 0;
}

/** Escalating interest clock: turn − (INTEREST_START_TURN − 1) from turn 9 (turn 9 → 1). */
export function clockDamage(turn: number): number {
  if (turn < INTEREST_START_TURN) return 0;
  return turn - (INTEREST_START_TURN - 1);
}

/** Total pending end-of-turn damage to Guppy: debt interest + clock damage. */
export function totalInterestDue(coins: number, turn: number): number {
  return debtInterest(coins) + clockDamage(turn);
}
