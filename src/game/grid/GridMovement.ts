/**
 * Movement range calculation using BFS implementing Duelyst-style movement rules.
 *
 * Rules:
 * - Units can move up to {@link GridUnit.moveRange} tiles per turn (default 2)
 * - Diagonal movement costs 2 (moving diagonally costs 2 movement points)
 * - Can move through friendly units but NOT through enemy units
 * - Cannot move diagonally BETWEEN two enemy units (diagonal squeeze blocked)
 * - Flying units can reach any unoccupied non-wall tile
 * - Units adjacent to an enemy with Provoke cannot move at all
 * - Flying units are still immobilized by Provoke (Duelyst rule)
 * - Wall tiles are impassable for all unit types
 *
 * All functions are pure — no side effects, no mutation of inputs.
 */
import type { GridPosition, GridState, GridUnit } from './GridTypes';
import { MoveType, TileType } from './GridTypes';
import { isInBounds, getUnitAt, isOccupied, areEnemies } from './GridFactory';
import { ALL_DIRECTIONS } from './GridDirections';

// ───── Distance Helpers ─────

/** Manhattan distance between two positions (orthogonal-only distance). */
export function getManhattanDistance(a: GridPosition, b: GridPosition): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

/** Chebyshev distance between two positions (max of axis deltas — used for diagonal checks). */
export function getChebyshevDistance(a: GridPosition, b: GridPosition): number {
  return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
}

/**
 * Movement cost between two adjacent tiles.
 * Returns 1 for orthogonal, 2 for diagonal, Infinity for non-adjacent.
 */
export function getMovementCost(from: GridPosition, to: GridPosition): number {
  const dx = Math.abs(from.x - to.x);
  const dy = Math.abs(from.y - to.y);
  if (dx === 0 && dy === 0) return 0;
  if (dx <= 1 && dy <= 1) {
    return dx !== 0 && dy !== 0 ? 2 : 1;
  }
  return Infinity;
}

// ───── Adjacent Position Helpers ─────

/**
 * Check if a diagonal move between `from` and `to` is blocked by the diagonal squeeze rule.
 * A unit is blocked from moving diagonally between two tiles if both orthogonal
 * neighbours between the start and end are occupied by enemy units.
 *
 * Example: moving from (0,0) → (1,1) is blocked if both (1,0) and (0,1) contain enemy units.
 */
function isDiagonalSqueezeBlocked(grid: GridState, mover: GridUnit, from: GridPosition, to: GridPosition): boolean {
  const dx = to.x - from.x;
  const dy = to.y - from.y;

  // Only applies to diagonal moves
  if (Math.abs(dx) !== 1 || Math.abs(dy) !== 1) return false;

  // The two orthogonal neighbours between the diagonal
  const orth1: GridPosition = { x: from.x + dx, y: from.y };
  const orth2: GridPosition = { x: from.x, y: from.y + dy };

  const unit1 = getUnitAt(grid, orth1);
  const unit2 = getUnitAt(grid, orth2);

  // Both must be alive enemy units relative to the mover
  const enemy1 = unit1 !== null && areEnemies(mover, unit1) && unit1.isAlive;
  const enemy2 = unit2 !== null && areEnemies(mover, unit2) && unit2.isAlive;

  return enemy1 && enemy2;
}

/**
 * Check if a unit is adjacent to any enemy unit with the Provoke keyword.
 * If so, the unit cannot move.
 */
function isAdjacentToProvoker(grid: GridState, unit: GridUnit): boolean {
  for (const [dx, dy] of ALL_DIRECTIONS) {
    const pos: GridPosition = { x: unit.position.x + dx, y: unit.position.y + dy };
    if (!isInBounds(pos, grid)) continue;
    const adjacent = getUnitAt(grid, pos);
    if (adjacent && adjacent.isAlive && adjacent.hasProvoke && areEnemies(unit, adjacent)) {
      return true;
    }
  }
  return false;
}

// ───── Movement Range BFS ─────

/** String key for grid positions used in Maps. */
function posKey(x: number, y: number): string {
  return `${x},${y}`;
}

/**
 * Get all positions reachable by a unit within its movement allowance.
 *
 * Returns a Set of `"x,y"` strings representing grid positions the unit can move TO.
 * The unit's starting position is NOT included in the result (a unit can always stay put).
 *
 * @param grid - The current grid state
 * @param unitId - ID of the unit to calculate range for
 * @returns Set of `"x,y"` strings for reachable positions
 */
export function getMovementRange(grid: GridState, unitId: string): Set<string> {
  const unit = grid.units.get(unitId);
  if (!unit || !unit.isAlive) return new Set<string>();

  // ── Provoke check (before Flying — flying doesn't escape provoke) ──
  // Flying units are still immobilized by Provoke (Duelyst rule).
  if (isAdjacentToProvoker(grid, unit)) {
    return new Set<string>();
  }

  // ── Flying: unrestricted movement (except wall tiles) ──
  if (unit.moveType === MoveType.Flying) {
    const reachable = new Set<string>();
    for (let y = 0; y < grid.height; y++) {
      for (let x = 0; x < grid.width; x++) {
        if (!isOccupied(grid, { x, y }) && grid.tiles[y][x].type !== TileType.Wall) {
          reachable.add(posKey(x, y));
        }
      }
    }
    return reachable;
  }

  // ── BFS with movement budget ──
  const movementBudget = unit.moveRange ?? 2;
  const startX = unit.position.x;
  const startY = unit.position.y;
  const startKey = posKey(startX, startY);

  // M3: Use Map instead of Set — tracks best remaining budget per position.
  // Allows cheaper paths to replace costlier first-discovery when budgets > 2.
  const bestBudget = new Map<string, number>();
  bestBudget.set(startKey, movementBudget);

  const reachable = new Set<string>();
  const queue: Array<{ x: number; y: number; budget: number }> = [];
  queue.push({ x: startX, y: startY, budget: movementBudget });

  while (queue.length > 0) {
    const current = queue.shift()!;

    for (const [dx, dy] of ALL_DIRECTIONS) {
      const nx = current.x + dx;
      const ny = current.y + dy;

      // Bounds check
      if (!isInBounds({ x: nx, y: ny }, grid)) continue;

      // M1: Wall tiles block all movement
      if (grid.tiles[ny][nx].type === TileType.Wall) continue;

      // Move cost
      const isDiagonal = dx !== 0 && dy !== 0;
      const cost = isDiagonal ? 2 : 1;

      if (current.budget < cost) continue;

      const newBudget = current.budget - cost;
      const neighborKey = posKey(nx, ny);

      // M3: Skip only when existing budget >= new budget
      const existing = bestBudget.get(neighborKey);
      if (existing !== undefined && existing >= newBudget) continue;
      bestBudget.set(neighborKey, newBudget);

      // C1: Diagonal squeeze check — uses areEnemies
      if (isDiagonal) {
        const from: GridPosition = { x: current.x, y: current.y };
        const to: GridPosition = { x: nx, y: ny };
        if (isDiagonalSqueezeBlocked(grid, unit, from, to)) {
          continue;
        }
      }

      // C1: Check if tile is blocked by an enemy unit (uses areEnemies)
      const occupant = getUnitAt(grid, { x: nx, y: ny });
      if (occupant) {
        if (areEnemies(unit, occupant) && occupant.isAlive) {
          // Cannot pass through or land on enemy units
          continue;
        }
        // Friendly unit — can path through but cannot end on
        queue.push({ x: nx, y: ny, budget: newBudget });
        continue;
      }

      // Unoccupied tile — can move here
      reachable.add(neighborKey);
      queue.push({ x: nx, y: ny, budget: newBudget });
    }
  }

  return reachable;
}

/**
 * Line of sight check using a simplified tile-walking algorithm.
 * Returns true if there are no Wall tiles between `from` and `to`.
 *
 * Used primarily for ranged attack validation.
 */
export function hasLineOfSight(grid: GridState, from: GridPosition, to: GridPosition): boolean {
  if (from.x === to.x && from.y === to.y) return true;

  // Simple line-walking: iterate along the dominant axis and check each tile
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const steps = Math.max(Math.abs(dx), Math.abs(dy));
  const stepX = dx / steps;
  const stepY = dy / steps;

  for (let i = 0; i <= steps; i++) {
    const x = Math.round(from.x + stepX * i);
    const y = Math.round(from.y + stepY * i);

    // Skip the start and end positions themselves
    if ((x === from.x && y === from.y) || (x === to.x && y === to.y)) continue;

    if (!isInBounds({ x, y }, grid)) return false;

    const tile = grid.tiles[y][x];
    if (tile.type === TileType.Wall) return false;
  }

  return true;
}
