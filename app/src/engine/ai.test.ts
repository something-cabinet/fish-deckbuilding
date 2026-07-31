import { describe, expect, it } from 'vitest';
import type { GridPos, Unit } from './contract';
import { decideEnemyAction, takeWithinCost } from './ai';

function playerUnit(uid: string, pos: GridPos, hp = 10): Unit {
  return {
    uid, templateId: 'guppy', name: 'Guppy', faction: 'player',
    pos, hp, maxHp: hp, attack: 2, movement: 2,
    armor: 0, debt: 0, isBoss: false, canMove: true, canAttack: true,
  };
}

function enemy(uid: string, pos: GridPos, over: Partial<Unit> = {}): Unit {
  return {
    uid, templateId: 'hustler', name: 'Hustler', faction: 'enemy',
    pos, hp: 3, maxHp: 3, attack: 3, movement: 2,
    armor: 0, debt: 0, isBoss: false, canMove: true, canAttack: true,
    ...over,
  };
}

const occupiedBy = (units: Unit[]) => (p: GridPos) =>
  units.some((u) => u.pos.x === p.x && u.pos.y === p.y);

describe('decideEnemyAction', () => {
  it('attacks the adjacent player unit with LOWEST hp', () => {
    const e = enemy('e1', { x: 5, y: 2 });
    const p1 = playerUnit('p1', { x: 5, y: 3 }, 10);
    const p2 = playerUnit('p2', { x: 5, y: 1 }, 4);
    const d = decideEnemyAction(e, { playerUnits: [p1, p2], occupied: occupiedBy([e, p1, p2]) });
    expect(d.kind).toBe('attack');
    if (d.kind === 'attack') expect(d.targetUid).toBe('p2');
  });

  it('passes when it cannot attack and cannot move', () => {
    const e = enemy('e1', { x: 8, y: 4 }, { canMove: false });
    const p = playerUnit('p1', { x: 0, y: 0 });
    const d = decideEnemyAction(e, { playerUnits: [p], occupied: occupiedBy([e, p]) });
    expect(d.kind).toBe('pass');
  });

  it('moves toward the nearest player unit when not adjacent', () => {
    const e = enemy('e1', { x: 7, y: 2 });
    const p = playerUnit('p1', { x: 5, y: 2 });
    const d = decideEnemyAction(e, { playerUnits: [p], occupied: occupiedBy([e, p]) });
    expect(d.kind).toBe('move');
    if (d.kind === 'move') {
      expect(d.path.length).toBeGreaterThan(0);
      expect(d.path[d.path.length - 1]!.x).toBeLessThan(7); // moving left toward player
      // path must not contain occupied cells
      for (const step of d.path) {
        expect(step).not.toEqual(p.pos);
        expect(step).not.toEqual(e.pos);
      }
    }
  });

  it('moves at most its movement points', () => {
    const e = enemy('e1', { x: 8, y: 4 }, { movement: 2 });
    const p = playerUnit('p1', { x: 0, y: 0 });
    const d = decideEnemyAction(e, { playerUnits: [p], occupied: occupiedBy([e, p]) });
    if (d.kind === 'move') {
      // orthogonal-only path costs 1/step; with 2 movement points, at most 2 steps
      expect(d.path.length).toBeLessThanOrEqual(2);
    }
  });

  it('charges a diagonal first step its real cost of 2', () => {
    // from (8,4): (7,3) is diagonal (cost 2), (6,3) is orthogonal (cost 1)
    const path: GridPos[] = [{ x: 7, y: 3 }, { x: 6, y: 3 }];
    // movement 2 fits ONLY the diagonal step (2 + 1 = 3 > 2)
    expect(takeWithinCost(path, { x: 8, y: 4 }, 2)).toEqual([{ x: 7, y: 3 }]);
    // movement 3 fits both
    expect(takeWithinCost(path, { x: 8, y: 4 }, 3)).toEqual([{ x: 7, y: 3 }, { x: 6, y: 3 }]);
    // orthogonal-only path fits 2 steps in movement 2
    const ortho: GridPos[] = [{ x: 7, y: 4 }, { x: 6, y: 4 }];
    expect(takeWithinCost(ortho, { x: 8, y: 4 }, 2)).toEqual([{ x: 7, y: 4 }, { x: 6, y: 4 }]);
  });

  it('passes when fully surrounded (no path)', () => {
    const e = enemy('e1', { x: 4, y: 2 });
    const blockers: Unit[] = [
      playerUnit('p1', { x: 4, y: 1 }),
      playerUnit('p2', { x: 4, y: 3 }),
      playerUnit('p3', { x: 3, y: 2 }),
      playerUnit('p4', { x: 5, y: 2 }),
      playerUnit('p5', { x: 3, y: 1 }),
      playerUnit('p6', { x: 5, y: 1 }),
      playerUnit('p7', { x: 3, y: 3 }),
      playerUnit('p8', { x: 5, y: 3 }),
    ];
    const d = decideEnemyAction(e, { playerUnits: blockers, occupied: occupiedBy([e, ...blockers]) });
    // adjacent enemies exist → attack, not pass
    expect(d.kind).toBe('attack');
  });

  it('prefers attack over move even when a move is available', () => {
    const e = enemy('e1', { x: 5, y: 2 });
    const p = playerUnit('p1', { x: 6, y: 2 });
    const d = decideEnemyAction(e, { playerUnits: [p], occupied: occupiedBy([e, p]) });
    expect(d.kind).toBe('attack');
  });
});
