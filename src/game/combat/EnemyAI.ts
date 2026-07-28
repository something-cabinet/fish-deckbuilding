/**
 * Grid-based enemy AI for the tactical combat engine.
 *
 * Each enemy decides its move and action based on its aiStrategy:
 *   - aggressive: Move toward nearest player unit. Attack if in range. Prefer hero.
 *   - balanced:   Move toward nearest enemy. Attack if in range.
 *   - defensive:  Hold position unless hero is very close. Attack if in range.
 *
 * Pure functions: state-in, state-out.
 */
import type { CombatState, CombatEnemy } from './CardTypes';
import type { GridPosition, GridUnit } from '../grid/GridTypes';
import { getMovementRange, getManhattanDistance, getChebyshevDistance } from '../grid/GridMovement';
import { getAttackableTargets } from '../grid/GridAttack';
import { damageWithArmor } from './ArmorSystem';
import { cloneGrid, moveUnit as gridMoveUnit } from '../grid/GridFactory';

// ───── Helpers ─────

function findNearestPlayerUnit(state: CombatState, from: GridPosition): GridUnit | null {
  const playerUnits: GridUnit[] = [];

  const heroUnit = state.grid.units.get(state.hero.unitId);
  if (heroUnit && heroUnit.isAlive) playerUnits.push(heroUnit);

  for (const summon of state.summons) {
    const summonUnit = state.grid.units.get(summon.unitId);
    if (summonUnit && summonUnit.isAlive) playerUnits.push(summonUnit);
  }

  for (const [, unit] of state.grid.units) {
    if (unit.type === 'summon' && unit.faction === 'player' && unit.isAlive) {
      if (!playerUnits.find(u => u.id === unit.id)) {
        playerUnits.push(unit);
      }
    }
  }

  if (playerUnits.length === 0) return null;

  let nearest: GridUnit | null = null;
  let bestDist = Infinity;

  for (const unit of playerUnits) {
    const dist = getManhattanDistance(from, unit.position);
    if (dist < bestDist) {
      bestDist = dist;
      nearest = unit;
    }
  }

  return nearest;
}

/**
 * Get the best position for an enemy to move to.
 */
export function getEnemyMoveTarget(state: CombatState, enemy: CombatEnemy): GridPosition | null {
  const enemyUnit = state.grid.units.get(enemy.unitId);
  if (!enemyUnit || !enemyUnit.isAlive) return null;

  const nearestPlayer = findNearestPlayerUnit(state, enemyUnit.position);
  if (!nearestPlayer) return null;

  const dist = getManhattanDistance(enemyUnit.position, nearestPlayer.position);

  // Defensive: don't move unless hero is very close (within 3 tiles)
  if (enemy.aiStrategy === 'defensive' && dist > 3) {
    return null;
  }

  // Already in attack range? No need to move
  // Use Chebyshev distance for melee (range 1), Manhattan for ranged
  if (enemy.attackRange <= 1) {
    if (getChebyshevDistance(enemyUnit.position, nearestPlayer.position) <= 1) {
      return null;
    }
  } else {
    if (dist <= enemy.attackRange) {
      return null;
    }
  }

  const moveRange = getMovementRange(state.grid, enemy.unitId);
  if (moveRange.size === 0) return null;

  let bestPos: GridPosition | null = null;
  let bestDist = Infinity;

  for (const key of moveRange) {
    const [x, y] = key.split(',').map(Number);
    const d = getManhattanDistance({ x, y }, nearestPlayer.position);
    if (d < bestDist) {
      bestDist = d;
      bestPos = { x, y };
    }
  }

  return bestPos;
}

/**
 * Get the best attack target for an enemy.
 * C4: Considers summon HP when deciding attack targets.
 *     Enemies can target summons.
 */
export function getEnemyAttackTarget(state: CombatState, enemy: CombatEnemy): string | null {
  const attackTargets = getAttackableTargets(state.grid, enemy.unitId);
  if (attackTargets.length === 0) return null;

  // Aggressive: prefer hero
  if (enemy.aiStrategy === 'aggressive') {
    const heroTarget = attackTargets.find(id => id === state.hero.unitId);
    if (heroTarget) return heroTarget;
  }

  // Find lowest HP target among valid targets (hero or summon)
  let bestTarget: string | null = null;
  let lowestHp = Infinity;

  for (const targetId of attackTargets) {
    // Check hero
    if (targetId === state.hero.unitId) {
      if (state.hero.hp < lowestHp) {
        lowestHp = state.hero.hp;
        bestTarget = targetId;
      }
      continue;
    }

    // Check summons (C4)
    const summon = state.summons.find(s => s.unitId === targetId);
    if (summon && summon.hp > 0) {
      if (summon.hp < lowestHp) {
        lowestHp = summon.hp;
        bestTarget = targetId;
      }
      continue;
    }

    // Fallback: any alive grid unit that is player-side
    const targetUnit = state.grid.units.get(targetId);
    if (targetUnit && targetUnit.type === 'summon' && targetUnit.faction === 'player' && targetUnit.isAlive) {
      // Unknown HP for grid-only summon — treat as having 1 HP
      if (1 < lowestHp) {
        lowestHp = 1;
        bestTarget = targetId;
      }
    }
  }

  // Fallback: pick first target
  if (!bestTarget) {
    bestTarget = attackTargets[0];
  }

  return bestTarget;
}

/**
 * Execute the enemy AI turn.
 */
export function executeEnemyTurn(state: CombatState): CombatState {
  let nextState = state;

  for (const enemy of nextState.enemies) {
    if (enemy.hp <= 0) continue;

    const enemyUnit = nextState.grid.units.get(enemy.unitId);
    if (!enemyUnit || !enemyUnit.isAlive) continue;

    // 1. Decide movement
    const moveTarget = getEnemyMoveTarget(nextState, enemy);
    if (moveTarget) {
      try {
        const newGrid = gridMoveUnit(nextState.grid, enemy.unitId, moveTarget);
        nextState = { ...nextState, grid: newGrid };
      } catch {
        // Movement failed
      }
    }

    // 2. Decide attack
    const attackTargetId = getEnemyAttackTarget(nextState, enemy);
    if (attackTargetId) {
      const attackDamage = enemy.attack;
      const result = damageWithArmor(nextState, attackTargetId, attackDamage);
      nextState = result.state;

      // Check if hero died
      if (attackTargetId === nextState.hero.unitId && nextState.hero.hp <= 0) {
        const heroGridUnit = nextState.grid.units.get(nextState.hero.unitId);
        if (heroGridUnit) {
          const g = cloneGrid(nextState.grid);
          g.tiles[heroGridUnit.position.y][heroGridUnit.position.x].occupiedBy = null;
          g.units.delete(nextState.hero.unitId);
          nextState = { ...nextState, grid: g };
        }
      }
      // Summon death is handled by damageWithArmor
    }
  }

  return nextState;
}
