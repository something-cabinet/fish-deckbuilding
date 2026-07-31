import { describe, expect, it } from 'vitest';
import { COIN_START, CREDIT_LIMIT, FORECLOSURE_TURN, INTEREST_START_TURN } from './contract';
import { canAfford, clockDamage, debtInterest, totalInterestDue } from './economy';

describe('economy constants', () => {
  it('start at 0 coins with credit to -5', () => {
    expect(COIN_START).toBe(0);
    expect(CREDIT_LIMIT).toBe(-5);
  });
  it('interest clock starts at turn 9, foreclosure at 16', () => {
    expect(INTEREST_START_TURN).toBe(9);
    expect(FORECLOSURE_TURN).toBe(16);
  });
});

describe('canAfford', () => {
  it('allows paying from current coins', () => {
    expect(canAfford(3, 5)).toBe(true);
    expect(canAfford(3, 3)).toBe(true);
  });
  it('allows borrowing down to the credit limit', () => {
    expect(canAfford(3, 0)).toBe(true); // borrows 3
    expect(canAfford(5, 0)).toBe(true); // borrows 5 (limit)
  });
  it('rejects beyond the credit limit', () => {
    expect(canAfford(6, 0)).toBe(false);
    expect(canAfford(5, 0)).toBe(true); // exactly at limit (-5)
    expect(canAfford(0, -5)).toBe(true); // already at limit, spend nothing
    expect(canAfford(1, -5)).toBe(false); // would go below -5
  });
});

describe('debtInterest', () => {
  it('is 0 when coins are non-negative', () => {
    expect(debtInterest(0)).toBe(0);
    expect(debtInterest(5)).toBe(0);
  });
  it('is |coins| when negative', () => {
    expect(debtInterest(-2)).toBe(2);
    expect(debtInterest(-5)).toBe(5);
  });
});

describe('clockDamage', () => {
  it('is 0 before turn 9', () => {
    expect(clockDamage(1)).toBe(0);
    expect(clockDamage(8)).toBe(0);
  });
  it('is turn-8 from turn 9 onward (turn 9 = 1, off-by-one safe)', () => {
    expect(clockDamage(9)).toBe(1);
    expect(clockDamage(10)).toBe(2);
    expect(clockDamage(15)).toBe(7);
  });
});

describe('totalInterestDue', () => {
  it('combines debt interest and clock damage as ONE number', () => {
    expect(totalInterestDue(0, 1)).toBe(0);
    expect(totalInterestDue(-3, 1)).toBe(3);
    expect(totalInterestDue(0, 10)).toBe(2);
    expect(totalInterestDue(-2, 10)).toBe(4);
  });
});
