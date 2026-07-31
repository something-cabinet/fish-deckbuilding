import type { Unit } from './contract';

/** Damage an attacker deals to a target: attack + target's debt stacks. */
export function attackDamage(attacker: Pick<Unit, 'attack'>, target: Pick<Unit, 'debt'>): number {
  return attacker.attack + target.debt;
}

export interface DamageResult {
  hp: number;
  armor: number;
  died: boolean;
}

/** Apply damage: armor absorbs first, then HP; hp clamps at 0. */
export function applyDamage(
  unit: Pick<Unit, 'hp' | 'armor' | 'maxHp'>,
  amount: number,
): DamageResult {
  let armor = unit.armor;
  let remaining = amount;
  const absorbed = Math.min(armor, remaining);
  armor -= absorbed;
  remaining -= absorbed;
  const hp = Math.max(0, unit.hp - remaining);
  return { hp, armor, died: hp <= 0 };
}

export interface AttackOutcome {
  targetHp: number;
  targetArmor: number;
  attackerHp: number;
  attackerArmor: number;
  targetDied: boolean;
  attackerDied: boolean;
  /** Counterattack damage dealt to the attacker, or null when no counterattack. */
  counterDamage: number | null;
}

/**
 * Resolve one base attack with a SYMMETRIC counterattack.
 * - Attacker deals `attack + target.debt` damage.
 * - If the target survives AND is adjacent (Chebyshev 1), it counterattacks
 *   with `target.attack + attacker.debt`.
 * - Counterattack never chains.
 * Pure function — returns results, does not mutate.
 */
export function resolveAttack(
  attacker: Unit,
  target: Unit,
  adjacent: boolean,
): AttackOutcome {
  const t = applyDamage(target, attackDamage(attacker, target));

  let attackerHp = attacker.hp;
  let attackerArmor = attacker.armor;
  let counterDamage: number | null = null;

  if (!t.died && adjacent) {
    counterDamage = attackDamage(target, attacker);
    const a = applyDamage(attacker, counterDamage);
    attackerHp = a.hp;
    attackerArmor = a.armor;
  }

  return {
    targetHp: t.hp,
    targetArmor: t.armor,
    attackerHp,
    attackerArmor,
    targetDied: t.died,
    attackerDied: attackerHp <= 0,
    counterDamage,
  };
}
