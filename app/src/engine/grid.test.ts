import { describe, expect, it } from 'vitest';
import type { GridPos } from './contract';
import { GRID_COLS, GRID_ROWS } from './contract';
import { adjacent, chebyshev, inBounds, moveCells, shortestPath } from './grid';

const none: (p: GridPos) => boolean = () => false;

describe('inBounds', () => {
  it('accepts cells inside the 9x5 grid', () => {
    expect(inBounds({ x: 0, y: 0 })).toBe(true);
    expect(inBounds({ x: 8, y: 4 })).toBe(true);
  });
  it('rejects cells outside the grid', () => {
    expect(inBounds({ x: -1, y: 0 })).toBe(false);
    expect(inBounds({ x: 9, y: 0 })).toBe(false);
    expect(inBounds({ x: 0, y: 5 })).toBe(false);
  });
});

describe('adjacent', () => {
  it('is true for 8-way neighbors', () => {
    expect(adjacent({ x: 4, y: 2 }, { x: 5, y: 2 })).toBe(true);
    expect(adjacent({ x: 4, y: 2 }, { x: 5, y: 3 })).toBe(true);
    expect(adjacent({ x: 4, y: 2 }, { x: 3, y: 1 })).toBe(true);
  });
  it('is false for self and distance-2', () => {
    expect(adjacent({ x: 4, y: 2 }, { x: 4, y: 2 })).toBe(false);
    expect(adjacent({ x: 4, y: 2 }, { x: 6, y: 2 })).toBe(false);
  });
});

describe('chebyshev', () => {
  it('computes Chebyshev distance', () => {
    expect(chebyshev({ x: 4, y: 2 }, { x: 6, y: 4 })).toBe(2);
    expect(chebyshev({ x: 4, y: 2 }, { x: 4, y: 2 })).toBe(0);
  });
});

describe('moveCells', () => {
  const key = (p: GridPos) => `${p.x},${p.y}`;
  const has = (cells: GridPos[], p: GridPos) => cells.some((c) => c.x === p.x && c.y === p.y);

  it('reaches orthogonal cells within movement points', () => {
    const cells = moveCells({ x: 4, y: 2 }, 2, none);
    expect(has(cells, { x: 6, y: 2 })).toBe(true);
    expect(has(cells, { x: 4, y: 4 })).toBe(true);
    expect(has(cells, { x: 4, y: 0 })).toBe(true);
    expect(cells.length).toBe(12); // 2-tile diamond: 1+4+... exact: ortho2 (4) + diag1 (4) + ortho1 (4) = 12
  });

  it('reaches diagonal cells at distance 1 (cost 2) but not distance 2', () => {
    const cells = moveCells({ x: 4, y: 2 }, 2, none);
    expect(has(cells, { x: 5, y: 3 })).toBe(true);
    expect(has(cells, { x: 6, y: 4 })).toBe(false); // diagonal 2 = cost 4 > 2
  });

  it('does not include the origin', () => {
    const cells = moveCells({ x: 4, y: 2 }, 2, none);
    expect(has(cells, { x: 4, y: 2 })).toBe(false);
  });

  it('excludes occupied cells', () => {
    const blocked = (p: GridPos) => p.x === 5 && p.y === 2;
    const cells = moveCells({ x: 4, y: 2 }, 2, blocked);
    expect(has(cells, { x: 5, y: 2 })).toBe(false);
    // cells beyond the blocker on the same row are unreachable
    expect(has(cells, { x: 6, y: 2 })).toBe(false);
  });

  it('blocks corner-cutting through two occupied orthogonals', () => {
    const blocked = (p: GridPos) =>
      (p.x === 5 && p.y === 2) || (p.x === 4 && p.y === 3);
    const cells = moveCells({ x: 4, y: 2 }, 2, blocked);
    // diagonal 5,3 requires both 5,2 and 4,3 to be free
    expect(has(cells, { x: 5, y: 3 })).toBe(false);
  });

  it('never returns out-of-bounds cells', () => {
    const cells = moveCells({ x: 0, y: 0 }, 2, none);
    expect(cells.every((c) => c.x >= 0 && c.x < GRID_COLS && c.y >= 0 && c.y < GRID_ROWS)).toBe(true);
  });

  it('treats the origin as free even if occupied() says otherwise', () => {
    const blocked = (p: GridPos) => p.x === 4 && p.y === 2; // the origin itself
    const cells = moveCells({ x: 4, y: 2 }, 2, blocked);
    expect(cells.length).toBeGreaterThan(0);
    expect(has(cells, { x: 5, y: 2 })).toBe(true);
  });

  it('respects movement 0 (no movement points)', () => {
    const cells = moveCells({ x: 4, y: 2 }, 0, none);
    expect(cells.length).toBe(0);
  });
});

describe('shortestPath', () => {
  it('returns a path from start to goal respecting diagonal cost', () => {
    const path = shortestPath({ x: 0, y: 0 }, { x: 2, y: 0 }, none);
    expect(path).not.toBeNull();
    expect(path![path!.length - 1]).toEqual({ x: 2, y: 0 });
    expect(path![0]).toEqual({ x: 1, y: 0 });
  });

  it('returns null when no path exists', () => {
    const blocked = (p: GridPos) => p.x === 1; // wall across the grid
    const path = shortestPath({ x: 0, y: 2 }, { x: 8, y: 2 }, blocked);
    expect(path).toBeNull();
  });

  it('routes around blockers', () => {
    const blocked = (p: GridPos) => p.x === 1 && p.y === 2;
    const path = shortestPath({ x: 0, y: 2 }, { x: 2, y: 2 }, blocked);
    expect(path).not.toBeNull();
    expect(path!.some((c) => c.x === 1 && c.y === 1 || c.x === 1 && c.y === 3)).toBe(true);
  });
});
