import { describe, expect, it } from 'vitest';
import { CREDIT_LIMIT, FORECLOSURE_TURN, INTEREST_START_TURN } from './contract';
import { interestDue, isForeclosed } from './economy';

describe('economy', () => {
  it('interestDue: 0 before start turn, +1 per turn after', () => {
    expect(interestDue(INTEREST_START_TURN - 1)).toBe(0);
    expect(interestDue(INTEREST_START_TURN)).toBe(1);
    expect(interestDue(INTEREST_START_TURN + 3)).toBe(4);
  });

  it('isForeclosed: only at or past foreclosure turn with coins at limit', () => {
    expect(isForeclosed(FORECLOSURE_TURN - 1, CREDIT_LIMIT)).toBe(false);
    expect(isForeclosed(FORECLOSURE_TURN, CREDIT_LIMIT)).toBe(true);
    expect(isForeclosed(FORECLOSURE_TURN, CREDIT_LIMIT - 5)).toBe(true);
    expect(isForeclosed(FORECLOSURE_TURN, CREDIT_LIMIT + 1)).toBe(false);
    expect(isForeclosed(FORECLOSURE_TURN + 2, CREDIT_LIMIT + 10)).toBe(false);
  });
});
