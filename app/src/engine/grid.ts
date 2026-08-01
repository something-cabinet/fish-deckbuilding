// Grid math + reachability. Pure functions; the single source of truth for
// valid-move / valid-target computation used by controller, render layer, and AI.

import { GRID_COLS, GRID_ROWS, MOVE_BUDGET } from './contract';
import type { GridPos, Unit } from './contract';

export function inBounds(p: GridPos): boolean {
  return p.x >= 0 && p.x < GRID_COLS && p.y >= 0 && p.y < GRID_ROWS;
}

/** Movement cost between adjacent tiles: orthogonal 1, diagonal 2. Non-adjacent = Infinity. */
export function moveCost(a: GridPos, b: GridPos): number {
  const dx = Math.abs(a.x - b.x);
  const dy = Math.abs(a.y - b.y);
  if (dx === 0 && dy === 0) return 0;
  if (dx + dy === 1) return 1;
  if (dx === 1 && dy === 1) return 2;
  return Infinity;
}

export function chebyshev(a: GridPos, b: GridPos): number {
  return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
}

export function isAdjacent(a: GridPos, b: GridPos): boolean {
  return chebyshev(a, b) === 1;
}

export function key(p: GridPos): string {
  return `${p.x},${p.y}`;
}

export function parseKey(k: string): GridPos {
  const [x, y] = k.split(',').map(Number);
  return { x: x ?? 0, y: y ?? 0 };
}

/** Tiles occupied by living units, optionally excluding one unit. */
export function occupiedTiles(units: Unit[], excludeUid?: string): Set<string> {
  const s = new Set<string>();
  for (const u of units) {
    if (!u.alive) continue;
    if (u.uid === excludeUid) continue;
    s.add(key(u.pos));
  }
  return s;
}

/**
 * All tiles reachable within `budget` move points from `from`, treating
 * orthogonal steps as 1 and diagonal steps as 2. Blocked by living units.
 * Dijkstra over 8-neighborhood with edge weights.
 */
export function reachableTiles(
  units: Unit[],
  from: GridPos,
  budget: number = MOVE_BUDGET,
  excludeUid?: string,
): GridPos[] {
  const blocked = occupiedTiles(units, excludeUid);
  const dist = new Map<string, number>([[key(from), 0]]);
  const queue: GridPos[] = [from];
  while (queue.length > 0) {
    const cur = queue.shift()!;
    const curDist = dist.get(key(cur))!;
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        if (dx === 0 && dy === 0) continue;
        const next = { x: cur.x + dx, y: cur.y + dy };
        if (!inBounds(next)) continue;
        if (blocked.has(key(next))) continue;
        const cost = moveCost(cur, next);
        if (!Number.isFinite(cost)) continue;
        const nd = curDist + cost;
        if (nd > budget) continue;
        const k = key(next);
        const prev = dist.get(k);
        if (prev === undefined || nd < prev) {
          dist.set(k, nd);
          queue.push(next);
        }
      }
    }
  }
  const result: GridPos[] = [];
  for (const [k, d] of dist) {
    if (d > 0 && d <= budget) result.push(parseKey(k));
  }
  return result;
}

/** Living enemy units adjacent to the attacker (8-way). */
export function attackableTargets(units: Unit[], attacker: Unit): Unit[] {
  return units.filter(
    (u) => u.alive && u.team !== attacker.team && isAdjacent(attacker.pos, u.pos),
  );
}

/** Living friendly units adjacent to a unit. */
export function adjacentFriendlies(units: Unit[], unit: Unit): Unit[] {
  return units.filter(
    (u) => u.alive && u.team === unit.team && isAdjacent(unit.pos, u.pos),
  );
}
