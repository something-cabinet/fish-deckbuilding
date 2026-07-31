import { describe, expect, it } from 'vitest';
import type { Unit } from './contract';
import { applyDamage, attackDamage, resolveAttack } from './combat';

function unit(over: Partial<Unit>): Unit {
  return {
    uid: 'u1',
    templateId: 't',
    name: 'T',
    faction: 'enemy',
    pos: { x: 0, y: 0 },
    hp: 10,
    maxHp: 10,
    attack: 2,
    movement: 2,
    armor: 0,
    debt: 0,
    isBoss: false,
    canMove: true,
    canAttack: true,
    ...over,
  };
}

describe('attackDamage', () => {
  it('is attacker attack + target debt stacks', () => {
    const a = unit({ attack: 3 });
    const t = unit({ debt: 2 });
    expect(attackDamage(a, t)).toBe(5);
  });

  it('is 0 debt by default', () => {
    const a = unit({ attack: 3 });
    const t = unit({ debt: 0 });
    expect(attackDamage(a, t)).toBe(3);
  });
});

describe('applyDamage', () => {
  it('reduces hp', () => {
    const r = applyDamage({ hp: 10, armor: 0, maxHp: 10 }, 4);
    expect(r.hp).toBe(6);
    expect(r.died).toBe(false);
  });

  it('armor absorbs before hp', () => {
    const r = applyDamage({ hp: 10, armor: 3, maxHp: 10 }, 4);
    expect(r.armor).toBe(0);
    expect(r.hp).toBe(9);
    expect(r.died).toBe(false);
  });

  it('armor absorbs fully when large enough', () => {
    const r = applyDamage({ hp: 10, armor: 5, maxHp: 10 }, 3);
    expect(r.armor).toBe(2);
    expect(r.hp).toBe(10);
  });

  it('clamps hp at 0 and reports death', () => {
    const r = applyDamage({ hp: 2, armor: 0, maxHp: 10 }, 5);
    expect(r.hp).toBe(0);
    expect(r.died).toBe(true);
  });
});

describe('resolveAttack', () => {
  it('deals damage including target debt', () => {
    const attacker = unit({ uid: 'a', attack: 3 });
    const target = unit({ uid: 't', hp: 10, debt: 1 });
    const r = resolveAttack(attacker, target, true);
    expect(r.targetHp).toBe(6); // 3 + 1 debt
    expect(r.targetDied).toBe(false);
  });

  it('counterattacks when target survives adjacent', () => {
    const attacker = unit({ uid: 'a', hp: 10, attack: 2 });
    const target = unit({ uid: 't', hp: 10, attack: 2 });
    const r = resolveAttack(attacker, target, true);
    expect(r.targetHp).toBe(8);
    expect(r.attackerHp).toBe(8);
    expect(r.counterDamage).toBe(2);
  });

  it('no counterattack when target dies', () => {
    const attacker = unit({ uid: 'a', attack: 5 });
    const target = unit({ uid: 't', hp: 2, attack: 3 });
    const r = resolveAttack(attacker, target, true);
    expect(r.targetHp).toBe(0);
    expect(r.targetDied).toBe(true);
    expect(r.counterDamage).toBeNull();
    expect(r.attackerHp).toBe(10); // attacker takes nothing
  });

  it('no counterattack when not adjacent', () => {
    const attacker = unit({ uid: 'a' });
    const target = unit({ uid: 't', hp: 10 });
    const r = resolveAttack(attacker, target, false);
    expect(r.targetHp).toBe(8);
    expect(r.counterDamage).toBeNull();
  });

  it('counterattack can kill the attacker', () => {
    const attacker = unit({ uid: 'a', hp: 2, attack: 1 });
    const target = unit({ uid: 't', hp: 10, attack: 5 });
    const r = resolveAttack(attacker, target, true);
    expect(r.attackerHp).toBe(0);
    expect(r.attackerDied).toBe(true);
  });

  it('counterattack does not chain (attacker never retaliates again)', () => {
    const attacker = unit({ uid: 'a', hp: 10, attack: 1 });
    const target = unit({ uid: 't', hp: 10, attack: 1 });
    const r = resolveAttack(attacker, target, true);
    // only ONE exchange: both at 9, no second swing
    expect(r.targetHp).toBe(9);
    expect(r.attackerHp).toBe(9);
  });

  it('respects armor on both sides', () => {
    const attacker = unit({ uid: 'a', hp: 10, attack: 4 });
    const target = unit({ uid: 't', hp: 10, attack: 4, armor: 2 });
    const r = resolveAttack(attacker, target, true);
    expect(r.targetHp).toBe(8); // 4 dmg: 2 armor + 2 hp
    expect(r.targetArmor).toBe(0);
    expect(r.attackerHp).toBe(6); // counter 4: attacker has no armor → 10 - 4
  });
});
