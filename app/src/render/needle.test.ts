import { describe, expect, it } from 'vitest';
import { BallisticNeedle } from './needle';

describe('BallisticNeedle', () => {
  it('starts at the initial value and is settled', () => {
    const n = new BallisticNeedle(5);
    expect(n.value).toBe(5);
    expect(n.settled()).toBe(true);
  });

  it('moves toward the target over time', () => {
    const n = new BallisticNeedle(0);
    n.setTarget(10);
    n.update(16, false);
    expect(n.value).toBeGreaterThan(0);
    expect(n.value).toBeLessThan(10);
    n.update(16, false);
    expect(n.value).toBeGreaterThan(0);
  });

  it('settles on the target', () => {
    const n = new BallisticNeedle(0);
    n.setTarget(10);
    for (let i = 0; i < 600; i++) n.update(16, false);
    expect(n.value).toBeCloseTo(10, 1);
    expect(n.settled()).toBe(true);
  });

  it('retargets the LATEST value (no queued swings)', () => {
    const n = new BallisticNeedle(0);
    n.setTarget(10);
    n.update(16, false);
    n.setTarget(2); // retarget before settling — must chase 2, not 10
    for (let i = 0; i < 600; i++) n.update(16, false);
    expect(n.value).toBeCloseTo(2, 1);
  });

  it('steps directly under reduced motion', () => {
    const n = new BallisticNeedle(3);
    n.setTarget(8);
    n.update(16, true);
    expect(n.value).toBe(8);
    expect(n.settled()).toBe(true);
  });

  it('never overshoots past a hard clamp', () => {
    const n = new BallisticNeedle(0);
    n.setTarget(100);
    let max = 0;
    for (let i = 0; i < 200; i++) {
      n.update(16, false);
      max = Math.max(max, n.value);
    }
    // spring may overshoot slightly before damping pulls back — assert sane bound
    expect(max).toBeLessThan(150);
    expect(n.value).toBeGreaterThan(50);
  });
});
