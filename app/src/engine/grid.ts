import type { GridPos } from './contract';
import { GRID_COLS, GRID_ROWS } from './contract';

export function inBounds(p: GridPos): boolean {
  return p.x >= 0 && p.x < GRID_COLS && p.y >= 0 && p.y < GRID_ROWS;
}

/** Chebyshev distance (8-way). */
export function chebyshev(a: GridPos, b: GridPos): number {
  return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
}

/** 8-way adjacency (Chebyshev distance exactly 1). */
export function adjacent(a: GridPos, b: GridPos): boolean {
  return chebyshev(a, b) === 1;
}

const DIRS: ReadonlyArray<readonly [dx: number, dy: number, cost: number]> = [
  [1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1],
  [1, 1, 2], [1, -1, 2], [-1, 1, 2], [-1, -1, 2],
];

const key = (p: GridPos) => `${p.x},${p.y}`;

/**
 * All cells reachable from `from` within `movement` points.
 * Orthogonal cost 1, diagonal cost 2, no corner-cutting (a diagonal step is
 * blocked when EITHER of its two orthogonal neighbors is occupied). The
 * origin is treated as free. Never includes the origin or out-of-bounds cells.
 */
export function moveCells(
  from: GridPos,
  movement: number,
  occupied: (p: GridPos) => boolean,
): GridPos[] {
  if (movement < 1) return [];
  const dist = new Map<string, number>([[key(from), 0]]);
  const queue: GridPos[] = [from];
  const result: GridPos[] = [];

  while (queue.length > 0) {
    const cur = queue.shift()!;
    const curDist = dist.get(key(cur))!;
    for (const [dx, dy, cost] of DIRS) {
      const np: GridPos = { x: cur.x + dx, y: cur.y + dy };
      if (!inBounds(np)) continue;
      const nd = curDist + cost;
      if (nd > movement) continue;
      if (cost === 2) {
        // corner-cutting check: both orthogonals must be passable
        const o1: GridPos = { x: cur.x + dx, y: cur.y };
        const o2: GridPos = { x: cur.x, y: cur.y + dy };
        if (occupied(o1) || occupied(o2)) continue;
      }
      if (occupied(np) && !(np.x === from.x && np.y === from.y)) continue;
      const k = key(np);
      const prev = dist.get(k);
      if (prev === undefined) {
        dist.set(k, nd);
        queue.push(np);
        result.push(np);
      } else if (nd < prev) {
        dist.set(k, nd);
      }
    }
  }
  return result;
}

/**
 * BFS shortest path (ortho 1, diag 2, no corner-cutting) from `from` to `to`.
 * Returns the path INCLUDING the goal, EXCLUDING the origin, or null.
 */
export function shortestPath(
  from: GridPos,
  to: GridPos,
  occupied: (p: GridPos) => boolean,
): GridPos[] | null {
  if (!inBounds(to) || occupied(to)) return null;
  if (from.x === to.x && from.y === to.y) return [];

  const dist = new Map<string, number>([[key(from), 0]]);
  const prev = new Map<string, GridPos>();
  const queue: GridPos[] = [from];

  while (queue.length > 0) {
    const cur = queue.shift()!;
    const curDist = dist.get(key(cur))!;
    for (const [dx, dy, cost] of DIRS) {
      const np: GridPos = { x: cur.x + dx, y: cur.y + dy };
      if (!inBounds(np) || occupied(np)) continue;
      if (cost === 2) {
        const o1: GridPos = { x: cur.x + dx, y: cur.y };
        const o2: GridPos = { x: cur.x, y: cur.y + dy };
        if (occupied(o1) || occupied(o2)) continue;
      }
      const nd = curDist + cost;
      const k = key(np);
      const prevDist = dist.get(k);
      if (prevDist === undefined || nd < prevDist) {
        dist.set(k, nd);
        prev.set(k, cur);
        queue.push(np);
      }
    }
  }

  if (!prev.has(key(to))) return null;
  const path: GridPos[] = [];
  let cur: GridPos | undefined = to;
  while (cur && !(cur.x === from.x && cur.y === from.y)) {
    path.push(cur);
    cur = prev.get(key(cur));
  }
  path.reverse();
  return path;
}
