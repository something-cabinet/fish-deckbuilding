// Economy: coins, interest due, foreclosure. Pure functions.

import { CREDIT_LIMIT, FORECLOSURE_TURN, INTEREST_START_TURN } from './contract';

/** Interest owed at the start of a given turn (0 before INTEREST_START_TURN). */
export function interestDue(turn: number): number {
  if (turn < INTEREST_START_TURN) return 0;
  return turn - INTEREST_START_TURN + 1;
}

/** Foreclosure: at or past the foreclosure turn, owing at least CREDIT_LIMIT. */
export function isForeclosed(turn: number, coins: number): boolean {
  return turn >= FORECLOSURE_TURN && coins <= CREDIT_LIMIT;
}
