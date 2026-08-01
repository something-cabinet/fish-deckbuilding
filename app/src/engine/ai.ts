// Basic enemy AI: move toward the nearest player unit, attack when adjacent.

import { MOVE_BUDGET } from './contract';
import type { GridPos, Unit } from './contract';
import { attackableTargets, key, reachableTiles } from './grid';

export interface AiMove {
  unitUid: string;
  to: GridPos;
}

export interface AiAttack {
  unitUid: string;
  targetUid: string;
}

export interface AiPlan {
  moves: AiMove[];
  attacks: AiAttack[];
}

/**
 * Greedy plan: each living enemy unit either attacks the lowest-HP adjacent
 * player unit, or steps toward the nearest player unit (shortest path by
 * move cost within budget). No card play.
 */
export function planEnemyTurn(units: Unit[]): AiPlan {
  const enemies = units.filter((u) => u.alive && u.team === 'enemy');
  const players = units.filter((u) => u.alive && u.team === 'player');
  const plan: AiPlan = { moves: [], attacks: [] };
  if (players.length === 0) return plan;

  const used = new Set<string>(units.filter((u) => u.alive).map((u) => key(u.pos)));

  for (const e of enemies) {
    used.delete(key(e.pos)); // own tile is free for stepping (occupied again below)
    const targets = attackableTargets(units, e).sort((a, b) => a.hp - b.hp);
    if (targets.length > 0) {
      plan.attacks.push({ unitUid: e.uid, targetUid: targets[0]!.uid });
      used.add(key(e.pos));
      continue;
    }

    // Nearest player unit by movement cost (path via reachable tiles).
    const tiles = reachableTiles(units, e.pos, MOVE_BUDGET, e.uid);
    let best: { tile: GridPos; cost: number } | null = null;
    for (const tile of tiles) {
      if (used.has(key(tile))) continue;
      let minCost = Infinity;
      for (const p of players) {
        const c = stepCost(tile, p.pos);
        if (c < minCost) minCost = c;
      }
      if (minCost < Infinity && (best === null || minCost < best.cost)) {
        best = { tile, cost: minCost };
      }
    }
    if (best) {
      used.add(key(best.tile));
      plan.moves.push({ unitUid: e.uid, to: best.tile });
    } else {
      used.add(key(e.pos));
    }
  }
  return plan;
}

/** Approximate remaining cost from a tile to a target position (chebyshev-scaled). */
function stepCost(from: GridPos, to: GridPos): number {
  const dx = Math.abs(from.x - to.x);
  const dy = Math.abs(from.y - to.y);
  // Diagonal steps cost 2, orthogonal 1 — approximate via max+min decomposition.
  const diag = Math.min(dx, dy);
  const orth = Math.max(dx, dy) - diag;
  return diag * 2 + orth;
}
