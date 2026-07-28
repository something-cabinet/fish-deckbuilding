import { describe, it, expect } from 'vitest';
import { MoveType, TileType } from '../GridTypes';
import type { GridPosition, GridState, GridUnit } from '../GridTypes';
import { createEmptyGrid, placeUnit, isOccupied, getUnitAt } from '../GridFactory';
import {
  getMovementRange,
  getManhattanDistance,
  getChebyshevDistance,
  getMovementCost,
  hasLineOfSight,
} from '../GridMovement';

// ───── Helpers ─────

function posKey(x: number, y: number): string {
  return `${x},${y}`;
}

function makeUnit(id: string, x: number, y: number, overrides: Partial<GridUnit> = {}): GridUnit {
  return {
    id,
    type: 'enemy',
    faction: 'enemy',
    position: { x, y },
    moveType: MoveType.Normal,
    moveRange: 2,
    attackRange: 1,
    hasProvoke: false,
    hasActed: false,
    hasMoved: false,
    hasAttacked: false,
    isAlive: true,
    ...overrides,
  };
}

function heroUnit(id: string, x: number, y: number, overrides: Partial<GridUnit> = {}): GridUnit {
  return makeUnit(id, x, y, { type: 'hero', faction: 'player', ...overrides });
}

function enemyUnit(id: string, x: number, y: number, overrides: Partial<GridUnit> = {}): GridUnit {
  return makeUnit(id, x, y, { type: 'enemy', faction: 'enemy', ...overrides });
}

function summonUnit(id: string, x: number, y: number, overrides: Partial<GridUnit> = {}): GridUnit {
  return makeUnit(id, x, y, { type: 'summon', faction: 'player', ...overrides });
}

// ───── Tests ─────

describe('GridMovement', () => {
  describe('getManhattanDistance', () => {
    it('should return 0 for same position', () => {
      expect(getManhattanDistance({ x: 3, y: 2 }, { x: 3, y: 2 })).toBe(0);
    });

    it('should calculate orthogonal distance', () => {
      expect(getManhattanDistance({ x: 0, y: 0 }, { x: 3, y: 2 })).toBe(5);
    });

    it('should work with negative differences', () => {
      expect(getManhattanDistance({ x: 5, y: 4 }, { x: 2, y: 1 })).toBe(6);
    });
  });

  describe('getChebyshevDistance', () => {
    it('should return 0 for same position', () => {
      expect(getChebyshevDistance({ x: 3, y: 2 }, { x: 3, y: 2 })).toBe(0);
    });

    it('should return max of axis deltas', () => {
      expect(getChebyshevDistance({ x: 0, y: 0 }, { x: 3, y: 2 })).toBe(3);
    });

    it('should handle diagonal distance', () => {
      expect(getChebyshevDistance({ x: 0, y: 0 }, { x: 2, y: 2 })).toBe(2);
    });
  });

  describe('getMovementCost', () => {
    it('should cost 1 for orthogonal movement', () => {
      expect(getMovementCost({ x: 0, y: 0 }, { x: 0, y: 1 })).toBe(1);
      expect(getMovementCost({ x: 3, y: 2 }, { x: 4, y: 2 })).toBe(1);
    });

    it('should cost 2 for diagonal movement', () => {
      expect(getMovementCost({ x: 0, y: 0 }, { x: 1, y: 1 })).toBe(2);
      expect(getMovementCost({ x: 3, y: 2 }, { x: 4, y: 3 })).toBe(2);
    });

    it('should cost 0 for same position', () => {
      expect(getMovementCost({ x: 0, y: 0 }, { x: 0, y: 0 })).toBe(0);
    });

    it('should return Infinity for non-adjacent positions', () => {
      expect(getMovementCost({ x: 0, y: 0 }, { x: 2, y: 0 })).toBe(Infinity);
      expect(getMovementCost({ x: 0, y: 0 }, { x: 2, y: 2 })).toBe(Infinity);
    });
  });

  describe('getMovementRange', () => {
    it('should return empty set for dead units', () => {
      const grid = createEmptyGrid();
      const unit = heroUnit('hero', 4, 2, { isAlive: false });
      const g = placeUnit(grid, unit);
      expect(getMovementRange(g, 'hero')).toEqual(new Set());
    });

    it('should return empty set for unknown unit ID', () => {
      const grid = createEmptyGrid();
      expect(getMovementRange(grid, 'nonexistent')).toEqual(new Set());
    });

    it('should include tiles within 2 orthogonal steps from center', () => {
      const grid = createEmptyGrid();
      const unit = heroUnit('hero', 4, 2);
      const g = placeUnit(grid, unit);

      const range = getMovementRange(g, 'hero');

      // Orthogonal reachable: (4,0), (4,1), (3,2), (5,2), (4,3), (4,4)
      expect(range.has(posKey(4, 0))).toBe(true);
      expect(range.has(posKey(4, 1))).toBe(true);
      expect(range.has(posKey(3, 2))).toBe(true);
      expect(range.has(posKey(5, 2))).toBe(true);
      expect(range.has(posKey(4, 3))).toBe(true);
      expect(range.has(posKey(4, 4))).toBe(true);

      // Adjacent diagonals (cost 2): reachable
      expect(range.has(posKey(3, 1))).toBe(true);
      expect(range.has(posKey(5, 1))).toBe(true);
      expect(range.has(posKey(3, 3))).toBe(true);
      expect(range.has(posKey(5, 3))).toBe(true);

      // Starting position should NOT be in range
      expect(range.has(posKey(4, 2))).toBe(false);
    });

    it('should limit range at board edges', () => {
      const grid = createEmptyGrid();
      const unit = heroUnit('hero', 0, 0); // Top-left corner
      const g = placeUnit(grid, unit);

      const range = getMovementRange(g, 'hero');

      // Can reach (0,1), (1,0), (1,1)
      expect(range.has(posKey(0, 1))).toBe(true);
      expect(range.has(posKey(1, 0))).toBe(true);
      expect(range.has(posKey(1, 1))).toBe(true);

      // Can reach (0,2) and (2,0) with orthogonal moves
      expect(range.has(posKey(0, 2))).toBe(true);
      expect(range.has(posKey(2, 0))).toBe(true);

      // Cannot go out of bounds
      expect(range.has(posKey(-1, 0))).toBe(false);
      expect(range.has(posKey(0, -1))).toBe(false);

      // Cannot reach (2,2) — needs diagonal cost 2 + orthogonal cost 1 = 3, over budget
      expect(range.has(posKey(2, 2))).toBe(false);
    });

    it('should respect diagonal cost — cannot reach (2,2) from (0,0) in one turn', () => {
      const grid = createEmptyGrid();
      const unit = heroUnit('hero', 0, 0);
      const g = placeUnit(grid, unit);

      const range = getMovementRange(g, 'hero');

      // (2,2) requires two diagonals (cost 2 + 2 = 4) or diagonal+orthogonal (2+1=3) — over budget
      expect(range.has(posKey(2, 2))).toBe(false);

      // (1,1) is one diagonal (cost 2) — reachable
      expect(range.has(posKey(1, 1))).toBe(true);
    });

    it('should allow moving through friendly units', () => {
      const grid = createEmptyGrid();
      const unit = heroUnit('hero', 0, 0);
      // Place friendly unit at (0,1) — blocking the direct orthogonal path
      const friend = heroUnit('friend', 0, 1);
      let g = placeUnit(grid, unit);
      g = placeUnit(g, friend);

      const range = getMovementRange(g, 'hero');

      // Should be able to reach (0,2) by pathing through (0,1)
      expect(range.has(posKey(0, 2))).toBe(true);

      // (0,1) is occupied though, so shouldn't be in reachable set
      expect(range.has(posKey(0, 1))).toBe(false);
    });

    it('should NOT allow moving through enemy units', () => {
      const grid = createEmptyGrid();
      const unit = heroUnit('hero', 0, 0);
      // Place enemy at (0,1) — blocking the direct orthogonal path
      const enemy = enemyUnit('enemy1', 0, 1);
      let g = placeUnit(grid, unit);
      g = placeUnit(g, enemy);

      const range = getMovementRange(g, 'hero');

      // Cannot reach (0,2) because enemy at (0,1) blocks the path
      expect(range.has(posKey(0, 2))).toBe(false);

      // Can still reach adjacent available tiles
      expect(range.has(posKey(1, 0))).toBe(true);
      expect(range.has(posKey(1, 1))).toBe(true);

      // (0,1) is blocked by enemy
      expect(range.has(posKey(0, 1))).toBe(false);
    });

    it('should block diagonal squeeze between two enemies', () => {
      const grid = createEmptyGrid();
      const unit = heroUnit('hero', 1, 1);
      // Place enemies at (2,1) and (1,2) — blocking the diagonal to (2,2)
      const enemy1 = enemyUnit('e1', 2, 1);
      const enemy2 = enemyUnit('e2', 1, 2);
      let g = placeUnit(grid, unit);
      g = placeUnit(g, enemy1);
      g = placeUnit(g, enemy2);

      const range = getMovementRange(g, 'hero');

      // Diagonal to (2,2) should be blocked by the squeeze rule
      expect(range.has(posKey(2, 2))).toBe(false);

      // Other diagonals with only one friendly blocker are still reachable
      expect(range.has(posKey(0, 0))).toBe(true); // (0,1) and (1,0) both empty
      expect(range.has(posKey(2, 0))).toBe(true); // (2,1) enemy but (1,0) empty
      expect(range.has(posKey(0, 2))).toBe(true); // (0,1) empty but (1,2) enemy

      // The orthogonal positions adjacent to enemies are occupied
      expect(range.has(posKey(2, 1))).toBe(false); // occupied by enemy
      expect(range.has(posKey(1, 2))).toBe(false); // occupied by enemy
    });

    it('should NOT block diagonal squeeze if only one adjacent enemy', () => {
      const grid = createEmptyGrid();
      const unit = heroUnit('hero', 0, 0);
      // Only one enemy at (1,0), (0,1) is empty
      const enemy1 = enemyUnit('e1', 1, 0);
      let g = placeUnit(grid, unit);
      g = placeUnit(g, enemy1);

      const range = getMovementRange(g, 'hero');

      // Diagonal to (1,1) should be reachable (only one blocker)
      expect(range.has(posKey(1, 1))).toBe(true);
    });

    it('should allow flying units to reach any unoccupied tile', () => {
      const grid = createEmptyGrid();
      const unit = heroUnit('hero', 4, 2, { moveType: MoveType.Flying });
      let g = placeUnit(grid, unit);

      // Place some enemies to ensure flying ignores them
      const enemy = enemyUnit('e1', 4, 1);
      g = placeUnit(g, enemy);

      const range = getMovementRange(g, 'hero');

      // Flying can reach any unoccupied tile
      expect(range.has(posKey(4, 0))).toBe(true);
      expect(range.has(posKey(8, 4))).toBe(true);
      expect(range.has(posKey(0, 0))).toBe(true);

      // Cannot land on occupied tiles
      expect(range.has(posKey(4, 1))).toBe(false);

      // Total unoccupied tiles = 9*5 - 2 = 43
      expect(range.size).toBe(43);
    });

    it('should prevent movement when adjacent to provoke enemy', () => {
      const grid = createEmptyGrid();
      const unit = heroUnit('hero', 4, 2);
      // Enemy with provoke directly adjacent
      const provoker = enemyUnit('e1', 4, 3, { hasProvoke: true });
      let g = placeUnit(grid, unit);
      g = placeUnit(g, provoker);

      const range = getMovementRange(g, 'hero');

      // Cannot move at all
      expect(range.size).toBe(0);
    });

    it('should prevent movement when provoke enemy is diagonal', () => {
      const grid = createEmptyGrid();
      const unit = heroUnit('hero', 4, 2);
      const provoker = enemyUnit('e1', 5, 3, { hasProvoke: true }); // diagonal
      let g = placeUnit(grid, unit);
      g = placeUnit(g, provoker);

      const range = getMovementRange(g, 'hero');
      expect(range.size).toBe(0);
    });

    it('should NOT prevent movement if provoke enemy is out of range', () => {
      const grid = createEmptyGrid();
      const unit = heroUnit('hero', 4, 2);
      const provoker = enemyUnit('e1', 6, 2, { hasProvoke: true }); // 2 tiles away
      let g = placeUnit(grid, unit);
      g = placeUnit(g, provoker);

      const range = getMovementRange(g, 'hero');
      // Should be able to move normally
      expect(range.size).toBeGreaterThan(0);
      expect(range.has(posKey(4, 1))).toBe(true);
      expect(range.has(posKey(5, 2))).toBe(true);
    });

    it('should not include tiles occupied by friendly units', () => {
      const grid = createEmptyGrid();
      const unit = heroUnit('hero', 4, 2);
      const friend = heroUnit('friend', 4, 3);
      let g = placeUnit(grid, unit);
      g = placeUnit(g, friend);

      const range = getMovementRange(g, 'hero');

      // (4,3) is occupied by friendly unit — not in range
      expect(range.has(posKey(4, 3))).toBe(false);

      // But we can still reach tiles beyond it
      expect(range.has(posKey(4, 4))).toBe(true);
    });

    it('should not include tiles occupied by enemy units', () => {
      const grid = createEmptyGrid();
      const unit = heroUnit('hero', 4, 2);
      const enemy = enemyUnit('e1', 4, 1);
      let g = placeUnit(grid, unit);
      g = placeUnit(g, enemy);

      const range = getMovementRange(g, 'hero');

      // (4,1) is occupied by enemy — not in range
      expect(range.has(posKey(4, 1))).toBe(false);

      // Can't reach beyond enemy either
      expect(range.has(posKey(4, 0))).toBe(false);
    });

    // ───── Faction Tests (C1) ─────

    it('should block enemy mover by hero (hero blocks enemy)', () => {
      const grid = createEmptyGrid();
      const enemy = enemyUnit('enemy', 0, 0);
      const hero = heroUnit('hero', 0, 1);
      let g = placeUnit(grid, enemy);
      g = placeUnit(g, hero);

      const range = getMovementRange(g, 'enemy');

      // Enemy can't reach (0,2) because hero at (0,1) blocks
      expect(range.has(posKey(0, 2))).toBe(false);
      expect(range.has(posKey(0, 1))).toBe(false);
    });

    it('should allow enemy mover to pass through other enemies (ally not blocked)', () => {
      const grid = createEmptyGrid();
      const enemy1 = enemyUnit('e1', 0, 0);
      const enemy2 = enemyUnit('e2', 0, 1); // same faction
      let g = placeUnit(grid, enemy1);
      g = placeUnit(g, enemy2);

      const range = getMovementRange(g, 'e1');

      // Can reach (0,2) by pathing through friendly enemy at (0,1)
      expect(range.has(posKey(0, 2))).toBe(true);
      // (0,1) is occupied though
      expect(range.has(posKey(0, 1))).toBe(false);
    });

    it('should NOT immobilize hero when friendly unit has provoke', () => {
      const grid = createEmptyGrid();
      const hero = heroUnit('hero', 4, 2);
      const friendlyProvoker = heroUnit('friend', 4, 3, { hasProvoke: true });
      let g = placeUnit(grid, hero);
      g = placeUnit(g, friendlyProvoker);

      const range = getMovementRange(g, 'hero');

      // Friendly provoke should not immobilize
      expect(range.size).toBeGreaterThan(0);
      expect(range.has(posKey(4, 1))).toBe(true);
    });

    it('should immobilize flying unit adjacent to provoke (flying does not escape provoke)', () => {
      const grid = createEmptyGrid();
      const flying = heroUnit('flyer', 4, 2, { moveType: MoveType.Flying });
      const provoker = enemyUnit('e1', 4, 3, { hasProvoke: true });
      let g = placeUnit(grid, flying);
      g = placeUnit(g, provoker);

      const range = getMovementRange(g, 'flyer');

      // Flying doesn't escape provoke
      expect(range.size).toBe(0);
    });

    // ───── Wall Blocking Tests (M1) ─────

    it('should block movement through wall tiles', () => {
      const grid = createEmptyGrid();
      const unit = heroUnit('hero', 4, 2);
      let g = placeUnit(grid, unit);
      // Place walls blocking orthogonal paths
      g.tiles[1][4].type = TileType.Wall; // (4,1) is wall
      g.tiles[3][4].type = TileType.Wall; // (4,3) is wall

      const range = getMovementRange(g, 'hero');

      // Cannot reach tiles beyond the walls
      expect(range.has(posKey(4, 0))).toBe(false);
      expect(range.has(posKey(4, 4))).toBe(false);
      // Adjacent unblocked tiles still reachable
      expect(range.has(posKey(3, 2))).toBe(true);
      expect(range.has(posKey(5, 2))).toBe(true);
    });

    it('should prevent flying from landing on wall tiles', () => {
      const grid = createEmptyGrid();
      const flying = heroUnit('flyer', 4, 2, { moveType: MoveType.Flying });
      let g = placeUnit(grid, flying);
      // Turn some tiles to walls
      g.tiles[0][4].type = TileType.Wall; // (4,0)
      g.tiles[4][4].type = TileType.Wall; // (4,4)

      const range = getMovementRange(g, 'flyer');

      // Flying cannot land on walls
      expect(range.has(posKey(4, 0))).toBe(false);
      expect(range.has(posKey(4, 4))).toBe(false);
      // But can reach other tiles
      expect(range.has(posKey(0, 0))).toBe(true);
      expect(range.has(posKey(8, 4))).toBe(true);
    });

    it('should allow flying to go over walls', () => {
      const grid = createEmptyGrid();
      const flying = heroUnit('flyer', 0, 0, { moveType: MoveType.Flying });
      let g = placeUnit(grid, flying);
      // Wall at (1,0) — would block ground unit
      g.tiles[0][1].type = TileType.Wall;

      const range = getMovementRange(g, 'flyer');

      // Flying can still reach tiles past the wall
      expect(range.has(posKey(2, 0))).toBe(true);
      expect(range.has(posKey(3, 0))).toBe(true);
      // But not on the wall itself
      expect(range.has(posKey(1, 0))).toBe(false);
    });

    // ───── MoveRange Tests (M2) ─────

    it('should allow unit with moveRange=3 to reach further', () => {
      const grid = createEmptyGrid();
      const unit = heroUnit('hero', 0, 0, { moveRange: 3 });
      const g = placeUnit(grid, unit);

      const range = getMovementRange(g, 'hero');

      // With budget 3, can reach (0,3) orthogonally
      expect(range.has(posKey(0, 3))).toBe(true);
      // Can reach (2,1) via diagonal(2) + orthogonal(1) = 3
      expect(range.has(posKey(2, 1))).toBe(true);
      // (3, 0) orthogonal is exactly 3
      expect(range.has(posKey(3, 0))).toBe(true);
      // (0,4) is 4 away — not reachable
      expect(range.has(posKey(0, 4))).toBe(false);
    });

    it('should limit unit with moveRange=1 to adjacent tiles', () => {
      const grid = createEmptyGrid();
      const unit = heroUnit('hero', 4, 2, { moveRange: 1 });
      const g = placeUnit(grid, unit);

      const range = getMovementRange(g, 'hero');

      // Adjacent orthogonal tiles (cost 1)
      expect(range.has(posKey(4, 1))).toBe(true);
      expect(range.has(posKey(3, 2))).toBe(true);
      expect(range.has(posKey(5, 2))).toBe(true);
      expect(range.has(posKey(4, 3))).toBe(true);

      // Adjacent diagonal tiles (cost 2) — not reachable with budget 1
      expect(range.has(posKey(3, 1))).toBe(false);
      expect(range.has(posKey(5, 1))).toBe(false);
      expect(range.has(posKey(3, 3))).toBe(false);
      expect(range.has(posKey(5, 3))).toBe(false);

      // Two steps away — not reachable
      expect(range.has(posKey(4, 0))).toBe(false);
    });
  });

  describe('hasLineOfSight', () => {
    it('should return true for same position', () => {
      const grid = createEmptyGrid();
      expect(hasLineOfSight(grid, { x: 0, y: 0 }, { x: 0, y: 0 })).toBe(true);
    });

    it('should return true for orthogonal adjacent tiles with no walls', () => {
      const grid = createEmptyGrid();
      expect(hasLineOfSight(grid, { x: 3, y: 2 }, { x: 3, y: 3 })).toBe(true);
    });

    it('should return true for diagonal tiles with no walls', () => {
      const grid = createEmptyGrid();
      expect(hasLineOfSight(grid, { x: 3, y: 2 }, { x: 4, y: 3 })).toBe(true);
    });

    it('should return true for far tiles with no walls', () => {
      const grid = createEmptyGrid();
      expect(hasLineOfSight(grid, { x: 0, y: 0 }, { x: 8, y: 4 })).toBe(true);
    });

    it('should return false when a wall blocks orthogonal line of sight', () => {
      const grid = createEmptyGrid();
      // Place a wall at (5, 2) between (3,2) and (7,2)
      grid.tiles[2][5].type = TileType.Wall;
      expect(hasLineOfSight(grid, { x: 3, y: 2 }, { x: 7, y: 2 })).toBe(false);
    });

    it('should return false when a wall blocks diagonal line of sight', () => {
      const grid = createEmptyGrid();
      // Place a wall roughly along the diagonal line from (0,0) to (4,4)
      grid.tiles[2][2].type = TileType.Wall;
      expect(hasLineOfSight(grid, { x: 0, y: 0 }, { x: 4, y: 4 })).toBe(false);
    });

    it('should return true if wall is not in the line', () => {
      const grid = createEmptyGrid();
      // Wall at (0,4) — far from the line of sight between (0,0) and (4,4)
      grid.tiles[4][0].type = TileType.Wall;
      expect(hasLineOfSight(grid, { x: 0, y: 0 }, { x: 4, y: 4 })).toBe(true);
    });
  });
});
