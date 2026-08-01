import { describe, expect, it } from 'vitest';
import {
  DRAMA_THRESHOLD,
  easeOutCubic,
  floatJitter,
  FLOAT_JITTER,
  MERGE_WINDOW_MS,
  SHAKE_MS,
  tweenDurationForTiles,
  tweenProgress,
} from './motion';

describe('motion', () => {
  it('easeOutCubic: starts at 0, ends at 1, monotonic, gentle tail', () => {
    expect(easeOutCubic(0)).toBe(0);
    expect(easeOutCubic(1)).toBe(1);
    expect(easeOutCubic(0.5)).toBeCloseTo(0.875);
    expect(easeOutCubic(0.25)).toBeLessThan(easeOutCubic(0.5));
    expect(easeOutCubic(0.5)).toBeLessThan(easeOutCubic(0.75));
  });

  it('tweenDurationForTiles: 300ms per tile, min 300ms', () => {
    expect(tweenDurationForTiles(1)).toBe(300);
    expect(tweenDurationForTiles(3)).toBe(900);
  });

  it('tweenProgress: clamps to 0..1', () => {
    expect(tweenProgress(100, 300, 50)).toBe(0);
    expect(tweenProgress(100, 300, 250)).toBeCloseTo(0.5);
    expect(tweenProgress(100, 300, 500)).toBe(1);
  });

  it('floatJitter: stays inside the ±24px band and is deterministic', () => {
    for (let i = 0; i < 50; i++) {
      const j = floatJitter(i);
      expect(Math.abs(j)).toBeLessThanOrEqual(FLOAT_JITTER);
    }
    expect(floatJitter(7)).toBe(floatJitter(7));
  });

  it('drama threshold: exactly 7 is drama; 6 is not', () => {
    expect(DRAMA_THRESHOLD).toBe(7);
    expect(6 < DRAMA_THRESHOLD).toBe(true);
  });

  it('merge window + shake timing constants match the thesis', () => {
    expect(MERGE_WINDOW_MS).toBeGreaterThanOrEqual(100);
    expect(MERGE_WINDOW_MS).toBeLessThanOrEqual(200);
    expect(SHAKE_MS).toBe(350);
  });
});
