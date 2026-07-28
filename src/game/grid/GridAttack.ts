/**
 * Attack range calculation and target validation.
 *
 * All functions are pure — no side effects, no mutation of inputs.
 */
import type { GridPosition, GridState } from './GridTypes';
import { getManhattanDistance, hasLineOfSight } from './GridMovement';
import { isInBounds, getUnitAt, areEnemies } from './GridFactory';
import { ALL_DIRECTIONS, ORTHOGONAL_DIRECTIONS } from './GridDirections';

/**
 * Get the 8 adjacent positions around a grid position (only those in bounds).
 */
export function getAdjacentPositions(pos: GridPosition, grid?: { width: number; height: number }): GridPosition[] {
  const result: GridPosition[] = [];
  for (const [dx, dy] of ALL_DIRECTIONS) {
    const neighbor: GridPosition = { x: pos.x + dx, y: pos.y + dy };
    if (isInBounds(neighbor, grid)) {
      result.push(neighbor);
    }
  }
  return result;
}

/**
 * Get the 4 orthogonal (cardinal) adjacent positions around a grid position (only those in bounds).
 */
export function getOrthogonalAdjacentPositions(pos: GridPosition, grid?: { width: number; height: number }): GridPosition[] {
  const result: GridPosition[] = [];
  for (const [dx, dy] of ORTHOGONAL_DIRECTIONS) {
    const neighbor: GridPosition = { x: pos.x + dx, y: pos.y + dy };
    if (isInBounds(neighbor, grid)) {
      result.push(neighbor);
    }
  }
  return result;
}

/**
 * Check if two positions are adjacent (8-directional, including diagonals).
 */
export function areAdjacent(a: GridPosition, b: GridPosition): boolean {
  return getChebyshevDistance(a, b) === 1;
}

// ───── Chebyshev distance (imported inline for areAdjacent) ─────

function getChebyshevDistance(a: GridPosition, b: GridPosition): number {
  return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
}

// ───── Attack Range ─────

/**
 * Get all IDs of units that the given unit can attack this turn.
 *
 * - Only targets on the opposing faction are valid
 * - Melee (range = 1): targets in any of the 8 adjacent tiles
 * - Ranged (range > 1): targets within Manhattan distance <= range, with line of sight
 * - Cannot attack own position
 *
 * @returns Array of unit IDs that are valid attack targets
 */
export function getAttackableTargets(grid: GridState, unitId: string): string[] {
  const attacker = grid.units.get(unitId);
  if (!attacker || !attacker.isAlive) return [];

  const targets: string[] = [];
  const range = attacker.attackRange;
  const isMelee = range === 1;

  for (const [, targetUnit] of grid.units) {
    if (targetUnit.id === unitId) continue;
    if (!targetUnit.isAlive) continue;
    // C1: Only enemies of the attacker
    if (!areEnemies(attacker, targetUnit)) continue;

    const dist = getManhattanDistance(attacker.position, targetUnit.position);

    if (isMelee) {
      // Melee: must be adjacent (8-direction)
      if (areAdjacent(attacker.position, targetUnit.position)) {
        targets.push(targetUnit.id);
      }
    } else {
      // Ranged: must be within Manhattan distance <= range, with line of sight
      if (dist <= range && hasLineOfSight(grid, attacker.position, targetUnit.position)) {
        targets.push(targetUnit.id);
      }
    }
  }

  return targets;
}

/**
 * Check if an attacker can attack a specific target unit.
 *
 * - Attacker and target must be alive
 * - Target must be on the opposing faction
 * - Target must be within attack range
 * - Line of sight is required for ranged attacks
 */
export function canAttack(grid: GridState, attackerId: string, targetId: string): boolean {
  const attacker = grid.units.get(attackerId);
  const target = grid.units.get(targetId);

  if (!attacker || !target) return false;
  if (!attacker.isAlive || !target.isAlive) return false;
  if (attacker.id === target.id) return false;
  // C1: Can only attack enemies
  if (!areEnemies(attacker, target)) return false;

  const range = attacker.attackRange;
  const dist = getManhattanDistance(attacker.position, target.position);

  if (range === 1) {
    // Melee: must be adjacent
    return areAdjacent(attacker.position, target.position);
  }

  // Ranged: within range with line of sight
  return dist <= range && hasLineOfSight(grid, attacker.position, target.position);
}
