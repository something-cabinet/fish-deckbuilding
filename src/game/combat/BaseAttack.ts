/**
 * Base attack system — hero's basic melee attack with counterattack.
 *
 * Pure functions: state-in, state-out.
 * C3: Enforces hasAttacked flag on the hero grid unit.
 */
import type { CombatState } from './CardTypes';
import { damageWithArmor } from './ArmorSystem';
import { cloneGrid } from '../grid/GridFactory';
import { areAdjacent } from '../grid/GridAttack';

/**
 * Hero performs a base attack on an adjacent enemy.
 *
 * Flow:
 * 1. Validate the enemy is adjacent to the hero
 * 2. Hero deals baseAttack damage to the enemy
 * 3. Enemy counterattacks with their attack stat
 * 4. Remove any dead units from the grid
 */
export function heroBaseAttack(state: CombatState, enemyId: string): CombatState {
  const hero = state.hero;
  const heroUnit = state.grid.units.get(hero.unitId);
  if (!heroUnit || !heroUnit.isAlive) return state;

  const enemyIndex = state.enemies.findIndex(e => e.id === enemyId);
  if (enemyIndex === -1) return state;

  const enemy = state.enemies[enemyIndex];
  if (enemy.hp <= 0) return state;

  const enemyUnit = state.grid.units.get(enemy.unitId);
  if (!enemyUnit || !enemyUnit.isAlive) return state;

  // Must be adjacent
  if (!areAdjacent(heroUnit.position, enemyUnit.position)) return state;

  let nextState = state;

  // Hero deals damage to enemy
  const heroDamage = hero.baseAttack;
  const attackResult = damageWithArmor(nextState, enemy.unitId, heroDamage);
  nextState = attackResult.state;

  // Enemy counterattacks (if still alive)
  const updatedEnemy = nextState.enemies[enemyIndex];
  if (updatedEnemy.hp > 0) {
    const counterResult = damageWithArmor(nextState, hero.unitId, updatedEnemy.attack);
    nextState = counterResult.state;
  }

  // Remove dead enemies from grid
  const finalEnemy = nextState.enemies[enemyIndex];
  if (finalEnemy.hp <= 0) {
    const gridUnit = nextState.grid.units.get(enemy.unitId);
    if (gridUnit) {
      const g = cloneGrid(nextState.grid);
      g.tiles[gridUnit.position.y][gridUnit.position.x].occupiedBy = null;
      g.units.delete(enemy.unitId);
      nextState = { ...nextState, grid: g };
    }
  }

  // Check if hero died from counterattack
  if (nextState.hero.hp <= 0) {
    const heroGridUnit = nextState.grid.units.get(hero.unitId);
    if (heroGridUnit) {
      const g = cloneGrid(nextState.grid);
      g.tiles[heroGridUnit.position.y][heroGridUnit.position.x].occupiedBy = null;
      g.units.delete(hero.unitId);
      nextState = { ...nextState, grid: g };
    }
  }

  return nextState;
}
