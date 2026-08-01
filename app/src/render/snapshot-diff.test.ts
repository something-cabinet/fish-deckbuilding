import { describe, expect, it } from 'vitest';
import type { GameSnapshot, GridPos, Unit } from '../engine/contract';
import { diffSnapshots } from './snapshot-diff';

function unit(uid: string, pos: GridPos, hp = 10): Unit {
  return {
    uid,
    name: uid,
    team: 'player',
    pos,
    hp,
    maxHp: 10,
    attack: 2,
    block: 0,
    moved: false,
    acted: false,
    alive: true,
  };
}

function snapshot(units: Unit[]): GameSnapshot {
  return {
    turn: 1,
    phase: 'player',
    coins: 0,
    interestDue: 0,
    mana: 1,
    hand: [],
    deck: [],
    discard: [],
    sellPile: [],
    units,
    heroUid: 'guppy',
    selectedUnitUid: null,
    validMoves: [],
    validAttackTargets: [],
    activeCardUid: null,
    activeCardTargets: null,
    activeCardUnitTargets: [],
    enemyIntents: [],
    log: [],
    winner: null,
    foreclosed: false,
  };
}

describe('snapshot-diff', () => {
  it('reports movement as from/to deltas', () => {
    const prev = snapshot([unit('a', { x: 1, y: 2 })]);
    const next = snapshot([{ ...unit('a', { x: 3, y: 2 }), moved: true }]);
    expect(diffSnapshots(prev, next).moved).toEqual([
      { uid: 'a', from: { x: 1, y: 2 }, to: { x: 3, y: 2 } },
    ]);
  });

  it('reports hp changes including the killing blow', () => {
    const prev = snapshot([unit('a', { x: 0, y: 0 }, 3)]);
    const next = snapshot([{ ...unit('a', { x: 0, y: 0 }), hp: 0, alive: false }]);
    const d = diffSnapshots(prev, next);
    expect(d.removed).toEqual(['a']);
    expect(d.hpChanges).toEqual([{ uid: 'a', before: 3, after: 0 }]);
  });

  it('reports summons as added', () => {
    const prev = snapshot([unit('guppy', { x: 1, y: 2 })]);
    const next = snapshot([unit('guppy', { x: 1, y: 2 }), unit('muscle-1', { x: 4, y: 3 }, 3)]);
    expect(diffSnapshots(prev, next).added).toEqual(['muscle-1']);
  });

  it('returns an empty diff for an unchanged snapshot', () => {
    const s = snapshot([unit('a', { x: 1, y: 2 })]);
    expect(diffSnapshots(s, s)).toEqual({ moved: [], hpChanges: [], added: [], removed: [] });
  });

  it('excludes dead units from moved and treats them as removed', () => {
    const prev = snapshot([unit('a', { x: 1, y: 2 }), unit('b', { x: 4, y: 4 }, 5)]);
    const next = snapshot([
      { ...unit('a', { x: 2, y: 2 }), moved: true },
      { ...unit('b', { x: 4, y: 4 }), hp: 0, alive: false },
    ]);
    const d = diffSnapshots(prev, next);
    expect(d.moved).toEqual([{ uid: 'a', from: { x: 1, y: 2 }, to: { x: 2, y: 2 } }]);
    expect(d.removed).toEqual(['b']);
    expect(d.hpChanges).toEqual([{ uid: 'b', before: 5, after: 0 }]);
  });
});
