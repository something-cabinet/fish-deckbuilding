import { describe, expect, it } from 'vitest';
import { GRID_COLS, GRID_ROWS } from './contract';
import type { GridPos, Unit } from './contract';
import { attackableTargets, inBounds, isAdjacent, key, moveCost, reachableTiles } from './grid';

function unit(uid: string, pos: GridPos, team: 'player' | 'enemy' = 'player'): Unit {
  return {
    uid,
    name: uid,
    team,
    pos,
    hp: 10,
    maxHp: 10,
    attack: 2,
    block: 0,
    moved: false,
    acted: false,
    alive: true,
  };
}

describe('grid', () => {
  it('moveCost: orthogonal 1, diagonal 2, non-adjacent Infinity', () => {
    expect(moveCost({ x: 0, y: 0 }, { x: 1, y: 0 })).toBe(1);
    expect(moveCost({ x: 0, y: 0 }, { x: 0, y: 1 })).toBe(1);
    expect(moveCost({ x: 0, y: 0 }, { x: 1, y: 1 })).toBe(2);
    expect(moveCost({ x: 0, y: 0 }, { x: 2, y: 0 })).toBe(Infinity);
  });

  it('inBounds and isAdjacent', () => {
    expect(inBounds({ x: 0, y: 0 })).toBe(true);
    expect(inBounds({ x: GRID_COLS, y: 0 })).toBe(false);
    expect(inBounds({ x: 0, y: GRID_ROWS })).toBe(false);
    expect(isAdjacent({ x: 1, y: 1 }, { x: 2, y: 2 })).toBe(true);
    expect(isAdjacent({ x: 1, y: 1 }, { x: 3, y: 1 })).toBe(false);
  });

  it('reachableTiles: budget 2 gives orthogonal pairs and diagonals', () => {
    const tiles = reachableTiles([], { x: 2, y: 2 }, 2);
    const keys = tiles.map(key).sort();
    expect(keys).toContain(key({ x: 3, y: 2 })); // 1 ortho
    expect(keys).toContain(key({ x: 4, y: 2 })); // 2 ortho
    expect(keys).toContain(key({ x: 3, y: 3 })); // 1 diag (cost 2)
    expect(keys).toContain(key({ x: 2, y: 4 })); // 2 ortho
    expect(keys).not.toContain(key({ x: 4, y: 4 })); // 2 diag = 4 > budget → absent
    expect(keys).not.toContain(key({ x: 2, y: 2 })); // self excluded
  });

  it('reachableTiles: diagonal chain cost accumulates (2 diag steps = 4 > 2)', () => {
    const tiles = reachableTiles([], { x: 0, y: 0 }, 2);
    const keys = tiles.map(key);
    expect(keys).toContain(key({ x: 1, y: 1 }));
    expect(keys).not.toContain(key({ x: 2, y: 2 }));
  });

  it('reachableTiles: blocked by living units, excluding self', () => {
    const blocker = unit('b', { x: 3, y: 2 });
    const tiles = reachableTiles([blocker], { x: 2, y: 2 }, 2, '');
    const keys = tiles.map(key);
    expect(keys).not.toContain(key({ x: 3, y: 2 }));
    expect(keys).not.toContain(key({ x: 4, y: 2 })); // beyond blocker
    expect(keys).toContain(key({ x: 2, y: 3 }));
  });

  it('reachableTiles: excludeUid lets own unit tile pass', () => {
    const self = unit('me', { x: 2, y: 2 });
    const other = unit('en', { x: 3, y: 2 }, 'enemy');
    const tiles = reachableTiles([self, other], { x: 2, y: 2 }, 2, self.uid);
    const keys = tiles.map(key);
    expect(keys).not.toContain(key({ x: 3, y: 2 })); // other blocks
    expect(keys).toContain(key({ x: 2, y: 3 }));
  });

  it('attackableTargets: only adjacent living enemies', () => {
    const me = unit('me', { x: 2, y: 2 });
    const near = unit('near', { x: 3, y: 2 }, 'enemy');
    const far = unit('far', { x: 5, y: 2 }, 'enemy');
    const dead = { ...unit('dead', { x: 2, y: 3 }, 'enemy'), alive: false };
    const friend = unit('friend', { x: 3, y: 3 });
    const targets = attackableTargets([me, near, far, dead, friend], me);
    expect(targets.map((t) => t.uid)).toEqual(['near']);
  });
});
