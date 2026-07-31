import { describe, expect, it } from 'vitest';
import type { GameSnapshot, Unit } from '../engine/contract';
import { damageOccurrences, diffSnapshots } from './snapshot-diff';

function unit(uid: string, over: Partial<Unit> = {}): Unit {
  return {
    uid, templateId: 't', name: uid, faction: 'enemy',
    pos: { x: 1, y: 1 }, hp: 10, maxHp: 10, attack: 2, movement: 2,
    armor: 0, debt: 0, isBoss: false, canMove: true, canAttack: true,
    ...over,
  };
}

function snap(over: Partial<GameSnapshot> = {}): GameSnapshot {
  return {
    turn: 1, phase: 'player', coins: 0, interestDue: 0,
    hand: [], deck: [], discard: [], sellPile: [],
    units: [unit('guppy', { faction: 'player' }), unit('e1')],
    heroUid: 'guppy', selectedUnitUid: null,
    validMoves: [], validAttackTargets: [],
    activeCardUid: null, activeCardTargets: null,
    log: [], winner: null,
    ...over,
  };
}

describe('diffSnapshots', () => {
  it('first snapshot marks all units as added', () => {
    const d = diffSnapshots(null, snap());
    expect(d.units.map((u) => u.uid)).toEqual(['guppy', 'e1']);
    expect(d.units.every((u) => u.added)).toBe(true);
    expect(d.coins).toBe(0);
    expect(d.winner).toEqual({ from: null, to: null });
  });

  it('hp/armor/debt changes surface as needle targets', () => {
    const prev = snap();
    const next = snap({
      units: [
        unit('guppy', { faction: 'player', hp: 7, armor: 2 }),
        unit('e1', { hp: 4, debt: 1 }),
      ],
    });
    const d = diffSnapshots(prev, next);
    const guppy = d.units.find((u) => u.uid === 'guppy')!;
    const e1 = d.units.find((u) => u.uid === 'e1')!;
    expect(guppy.hp).toBe(7);
    expect(guppy.armor).toBe(2);
    expect(guppy.added).toBe(false);
    expect(e1.hp).toBe(4);
    expect(e1.debt).toBe(1);
  });

  it('removed units disappear from the diff set', () => {
    const prev = snap();
    const next = snap({ units: [unit('guppy', { faction: 'player' })] }); // e1 dead
    const d = diffSnapshots(prev, next);
    expect(d.units.map((u) => u.uid)).toEqual(['guppy']);
  });

  it('coins delta is computed', () => {
    const prev = snap({ coins: -3 });
    const d = diffSnapshots(prev, snap({ coins: 1 }));
    expect(d.coins).toBe(1);
    expect(d.coinDelta).toBe(4);
  });

  it('winner and turn transitions surface', () => {
    const prev = snap();
    const next = snap({ winner: 'player', turn: 4 });
    const d = diffSnapshots(prev, next);
    expect(d.winner).toEqual({ from: null, to: 'player' });
    expect(d.turn).toEqual({ from: 1, to: 4 });
  });

  it('no-change snapshots produce null transitions', () => {
    const s = snap();
    const d = diffSnapshots(s, s);
    expect(d.coins).toBeNull();
    expect(d.winner).toBeNull();
    expect(d.turn).toBeNull();
    expect(d.phase).toBeNull();
    expect(d.units.every((u) => !u.added)).toBe(true);
  });
});

describe('damageOccurrences', () => {
  it('reports units that lost hp', () => {
    const prev = snap();
    const next = snap({ units: [unit('guppy', { faction: 'player', hp: 7 }), unit('e1', { hp: 3 })] });
    const dmg = damageOccurrences(prev, next);
    expect(dmg).toEqual([
      { uid: 'guppy', damage: 3 },
      { uid: 'e1', damage: 7 },
    ]);
  });

  it('ignores heals, new units, and unchanged units', () => {
    const prev = snap();
    const next = snap({
      units: [
        unit('guppy', { faction: 'player', hp: 12 }), // healed
        unit('e1', { hp: 10 }), // unchanged
        unit('e2', { hp: 5 }), // new
      ],
    });
    expect(damageOccurrences(prev, next)).toEqual([]);
  });

  it('reports death as full hp loss', () => {
    const prev = snap();
    const next = snap({ units: [unit('guppy', { faction: 'player', hp: 10 })] }); // e1 removed
    expect(damageOccurrences(prev, next)).toEqual([]); // removal is not an hp loss
  });

  it('returns empty for the first snapshot', () => {
    expect(damageOccurrences(null, snap())).toEqual([]);
  });
});
