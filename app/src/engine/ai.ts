import type { GridPos, Unit } from './contract';
import { adjacent, shortestPath } from './grid';

export type AiDecision =
  | { kind: 'attack'; targetUid: string }
  | { kind: 'move'; path: GridPos[] }
  | { kind: 'pass' };

export interface AiCtx {
  playerUnits: Unit[];
  occupied: (p: GridPos) => boolean;
}

/**
 * Grid-aware enemy AI (D12):
 * 1. If it can attack and any player unit is adjacent (Chebyshev 1) →
 *    attack the player unit with the LOWEST hp.
 * 2. Else if it can move → move along the shortest path toward the nearest
 *    player unit, up to `unit.movement` points (ortho 1, diag 2).
 * 3. Else pass.
 * Pure function — never mutates.
 */
export function decideEnemyAction(unit: Unit, ctx: AiCtx): AiDecision {
  if (unit.canAttack) {
    const adjacentTargets = ctx.playerUnits
      .filter((p) => p.hp > 0 && adjacent(p.pos, unit.pos))
      .sort((a, b) => a.hp - b.hp);
    if (adjacentTargets.length > 0) {
      return { kind: 'attack', targetUid: adjacentTargets[0]!.uid };
    }
  }

  if (unit.canMove) {
    let bestPath: GridPos[] | null = null;
    let bestCost = Infinity;
    for (const p of ctx.playerUnits) {
      if (p.hp <= 0) continue;
      // try every empty cell adjacent to the player unit
      for (const cell of neighborCells(p.pos)) {
        if (ctx.occupied(cell) && !(cell.x === unit.pos.x && cell.y === unit.pos.y)) continue;
        const path = shortestPath(unit.pos, cell, ctx.occupied);
        if (!path) continue;
        const cost = pathCost(path, unit.pos);
        if (cost < bestCost) {
          bestCost = cost;
          bestPath = path;
        }
      }
    }
    if (bestPath && bestPath.length > 0) {
      return { kind: 'move', path: takeWithinCost(bestPath, unit.pos, unit.movement) };
    }
  }

  return { kind: 'pass' };
}

const DIRS: ReadonlyArray<readonly [number, number]> = [
  [1, 0], [-1, 0], [0, 1], [0, -1],
  [1, 1], [1, -1], [-1, 1], [-1, -1],
];

function neighborCells(pos: GridPos): GridPos[] {
  return DIRS.map(([dx, dy]) => ({ x: pos.x + dx, y: pos.y + dy }));
}

function pathCost(path: GridPos[], from: GridPos): number {
  let cost = 0;
  let prev: GridPos = from;
  for (const step of path) {
    cost += step.x !== prev.x && step.y !== prev.y ? 2 : 1;
    prev = step;
  }
  return cost;
}

/**
 * First steps of the path within the movement budget (ortho 1, diag 2).
 * Exported for direct unit testing of the budget math.
 */
export function takeWithinCost(path: GridPos[], from: GridPos, movement: number): GridPos[] {
  const out: GridPos[] = [];
  let spent = 0;
  let prev: GridPos = from;
  for (const step of path) {
    const cost = step.x !== prev.x && step.y !== prev.y ? 2 : 1;
    if (spent + cost > movement) break;
    out.push(step);
    spent += cost;
    prev = step;
  }
  return out;
}
