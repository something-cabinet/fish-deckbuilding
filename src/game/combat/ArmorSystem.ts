/**
 * Armor system for the tactical combat engine.
 *
 * Armor absorbs incoming damage before it reaches HP.
 * C4: damageWithArmor also handles summons — applies damage to summon HP
 *      and removes dead summons from grid + summons array.
 *
 * Pure functions: state-in, state-out.
 */
import type { CombatState } from './CardTypes';
import { cloneGrid } from '../grid/GridFactory';

/**
 * Apply armor to a target (hero or enemy) identified by unitId.
 */
export function applyArmor(state: CombatState, targetUnitId: string, amount: number, turns: number = 1): CombatState {
  if (targetUnitId === state.hero.unitId) {
    return {
      ...state,
      hero: {
        ...state.hero,
        armor: state.hero.armor + amount,
        armorTurns: Math.max(state.hero.armorTurns, turns),
      },
    };
  }

  const enemyIndex = state.enemies.findIndex(e => e.unitId === targetUnitId);
  if (enemyIndex === -1) return state;

  const enemies = [...state.enemies];
  enemies[enemyIndex] = {
    ...enemies[enemyIndex],
    armor: enemies[enemyIndex].armor + amount,
  };

  return { ...state, enemies };
}

/**
 * Tick down armor durations.
 */
export function tickArmor(state: CombatState): CombatState {
  let hero = { ...state.hero };

  if (hero.armor > 0) {
    hero.armorTurns -= 1;
    if (hero.armorTurns <= 0) {
      hero.armor = 0;
      hero.armorTurns = 0;
    }
  }

  const enemies = state.enemies.map(e => {
    if (e.armor > 0) {
      return { ...e, armor: 0 };
    }
    return e;
  });

  return { ...state, hero, enemies };
}

/**
 * Apply damage to a target unit. Armor absorbs damage first.
 * Handles hero, enemies, and summons.
 * Returns the new CombatState and the actual health damage dealt (after armor absorption).
 */
export function damageWithArmor(
  state: CombatState,
  targetUnitId: string,
  amount: number,
): { state: CombatState; actualDamage: number } {
  // ── Hero ──
  if (targetUnitId === state.hero.unitId) {
    const armor = state.hero.armor;
    const damageToArmor = Math.min(armor, amount);
    const damageToHp = amount - damageToArmor;

    return {
      state: {
        ...state,
        hero: {
          ...state.hero,
          armor: armor - damageToArmor,
          hp: Math.max(0, state.hero.hp - damageToHp),
        },
      },
      actualDamage: damageToHp, // Return actual HP damage dealt
    };
  }

  // ── Enemies ──
  const enemyIndex = state.enemies.findIndex(e => e.unitId === targetUnitId);
  if (enemyIndex !== -1) {
    const enemy = state.enemies[enemyIndex];
    const armor = enemy.armor;
    const damageToArmor = Math.min(armor, amount);
    const damageToHp = amount - damageToArmor;

    const enemies = [...state.enemies];
    enemies[enemyIndex] = {
      ...enemy,
      armor: armor - damageToArmor,
      hp: Math.max(0, enemy.hp - damageToHp),
    };

    return { state: { ...state, enemies }, actualDamage: damageToHp };
  }

  // ── Summons (C4) ──
  const summonIndex = state.summons.findIndex(s => s.unitId === targetUnitId);
  if (summonIndex !== -1) {
    const summon = state.summons[summonIndex];
    const damageToHp = Math.min(amount, summon.hp);
    const newHp = summon.hp - damageToHp;

    let summons = [...state.summons];
    summons[summonIndex] = { ...summon, hp: newHp };

    let nextState: CombatState = { ...state, summons };

    // Remove dead summon from grid + summons array
    if (newHp <= 0) {
      const gridUnit = nextState.grid.units.get(targetUnitId);
      if (gridUnit) {
        const g = cloneGrid(nextState.grid);
        g.tiles[gridUnit.position.y][gridUnit.position.x].occupiedBy = null;
        g.units.delete(targetUnitId);
        nextState = { ...nextState, grid: g };
      }
      summons = summons.filter(s => s.unitId !== targetUnitId);
      nextState = { ...nextState, summons };
    }

    return { state: nextState, actualDamage: damageToHp };
  }

  return { state, actualDamage: 0 };
}
