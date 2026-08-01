// Combat resolution: attacks with symmetric counterattacks and block absorption.

import type { Unit } from './contract';
import { isAdjacent } from './grid';

export interface CombatResult {
  damageToDefender: number;
  damageToAttacker: number;
  defenderDied: boolean;
  attackerDied: boolean;
}

export function canAttack(attacker: Unit, defender: Unit): boolean {
  return (
    attacker.alive &&
    defender.alive &&
    attacker.team !== defender.team &&
    isAdjacent(attacker.pos, defender.pos)
  );
}

/**
 * Apply `amount` damage to a unit: block absorbs first, then HP. Returns actual
 * HP damage dealt (post-block).
 */
export function applyDamage(unit: Unit, amount: number): number {
  const absorbed = Math.min(unit.block, amount);
  unit.block -= absorbed;
  const dealt = amount - absorbed;
  unit.hp = Math.max(0, unit.hp - dealt);
  if (unit.hp <= 0) unit.alive = false;
  return dealt;
}

/**
 * Symmetric counterattack: defender strikes back if it survives (post-block).
 * Death predictions account for block absorption so shielded units are never
 * declared dead early and never lose their counterattack.
 */
export function resolveAttack(attacker: Unit, defender: Unit): CombatResult {
  const damageToDefender = Math.max(0, attacker.attack);
  const throughToDefender = Math.max(0, damageToDefender - defender.block);
  const defenderDied = defender.hp - throughToDefender <= 0;
  const damageToAttacker = defenderDied ? 0 : Math.max(0, defender.attack);
  const throughToAttacker = Math.max(0, damageToAttacker - attacker.block);
  const attackerDied = attacker.hp - throughToAttacker <= 0;
  return { damageToDefender, damageToAttacker, defenderDied, attackerDied };
}
