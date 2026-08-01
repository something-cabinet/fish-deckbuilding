import { describe, expect, it } from 'vitest';
import type { Unit } from './contract';
import { planEnemyTurn } from './ai';

function unit(uid: string, team: 'player' | 'enemy', x: number, y: number, hp = 5, attack = 2): Unit {
  return {
    uid,
    name: uid,
    team,
    pos: { x, y },
    hp,
    maxHp: hp,
    attack,
    block: 0,
    moved: false,
    acted: false,
    alive: true,
  };
}

describe('ai', () => {
  it('attacks when adjacent to a player unit (lowest HP target)', () => {
    const hero = unit('guppy', 'player', 3, 2);
    const e1 = unit('e1', 'enemy', 4, 2, 5);
    const plan = planEnemyTurn([hero, e1]);
    expect(plan.attacks).toContainEqual({ unitUid: 'e1', targetUid: 'guppy' });
    expect(plan.moves).toHaveLength(0);
  });

  it('moves toward the nearest player unit when not adjacent', () => {
    const hero = unit('guppy', 'player', 7, 2);
    const e1 = unit('e1', 'enemy', 2, 2, 5);
    const plan = planEnemyTurn([hero, e1]);
    expect(plan.attacks).toHaveLength(0);
    expect(plan.moves).toHaveLength(1);
    const mv = plan.moves[0]!;
    expect(mv.unitUid).toBe('e1');
    // The move should reduce distance toward (7,2).
    const d0 = Math.abs(2 - 7) + Math.abs(2 - 2);
    const d1 = Math.abs(mv.to.x - 7) + Math.abs(mv.to.y - 2);
    expect(d1).toBeLessThan(d0);
  });

  it('no plan when no player units', () => {
    const e1 = unit('e1', 'enemy', 2, 2);
    const plan = planEnemyTurn([e1]);
    expect(plan.moves).toHaveLength(0);
    expect(plan.attacks).toHaveLength(0);
  });

  it('enemies do not share destination tiles', () => {
    const hero = unit('guppy', 'player', 8, 2);
    const e1 = unit('e1', 'enemy', 2, 1);
    const e2 = unit('e2', 'enemy', 2, 3);
    const plan = planEnemyTurn([hero, e1, e2]);
    const dests = plan.moves.map((m) => `${m.to.x},${m.to.y}`);
    expect(new Set(dests).size).toBe(dests.length);
  });
});
