import { describe, expect, it } from 'vitest';
import type { Unit } from './contract';
import { applyDamage, canAttack, resolveAttack } from './combat';

function unit(uid: string, hp: number, attack: number, block = 0, pos = { x: 1, y: 1 }): Unit {
  return {
    uid,
    name: uid,
    team: uid.startsWith('e') ? 'enemy' : 'player',
    pos,
    hp,
    maxHp: hp,
    attack,
    block,
    moved: false,
    acted: false,
    alive: true,
  };
}

describe('combat', () => {
  it('applyDamage: block absorbs first, then HP; death clears alive', () => {
    const u = unit('p1', 10, 2, 3);
    expect(applyDamage(u, 4)).toBe(1); // 3 absorbed by block
    expect(u.block).toBe(0);
    expect(u.hp).toBe(9);
    expect(u.alive).toBe(true);
  });

  it('applyDamage: HP floors at 0 and sets alive false', () => {
    const u = unit('p1', 2, 2);
    applyDamage(u, 5);
    expect(u.hp).toBe(0);
    expect(u.alive).toBe(false);
  });

  it('resolveAttack: defender survives → symmetric counterattack', () => {
    const a = unit('p1', 10, 3);
    const d = unit('e1', 10, 2);
    const r = resolveAttack(a, d);
    expect(r.damageToDefender).toBe(3);
    expect(r.damageToAttacker).toBe(2); // counter
    expect(r.defenderDied).toBe(false);
    expect(r.attackerDied).toBe(false);
  });

  it('resolveAttack: defender dies → no counterattack', () => {
    const a = unit('p1', 10, 6);
    const d = unit('e1', 3, 4);
    const r = resolveAttack(a, d);
    expect(r.damageToDefender).toBe(6);
    expect(r.damageToAttacker).toBe(0);
    expect(r.defenderDied).toBe(true);
    expect(r.attackerDied).toBe(false);
  });

  it('resolveAttack: attacker dies only if defender survives to counter', () => {
    const a = unit('p1', 3, 5);
    const d = unit('e1', 4, 4);
    const r = resolveAttack(a, d);
    expect(r.defenderDied).toBe(true);
    expect(r.damageToAttacker).toBe(0); // dead defender cannot counter
    expect(r.attackerDied).toBe(false);
  });

  it('canAttack: requires opposite teams + adjacency + alive', () => {
    const a = unit('p1', 10, 2, 0, { x: 1, y: 1 });
    const e = unit('e1', 10, 2, 0, { x: 2, y: 1 });
    const f = unit('p2', 10, 2, 0, { x: 3, y: 1 });
    expect(canAttack(a, e)).toBe(true);
    expect(canAttack(a, f)).toBe(false); // same team
    const far = { ...e, pos: { x: 5, y: 5 } };
    expect(canAttack(a, far)).toBe(false); // not adjacent
    expect(canAttack({ ...a, alive: false }, e)).toBe(false);
  });
});
