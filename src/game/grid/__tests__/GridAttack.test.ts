import { describe, it, expect } from 'vitest';
import { MoveType, TileType } from '../GridTypes';
import type { GridUnit } from '../GridTypes';
import { createEmptyGrid, placeUnit } from '../GridFactory';
import { getManhattanDistance } from '../GridMovement';
import {
  getAttackableTargets,
  canAttack,
  getAdjacentPositions,
  getOrthogonalAdjacentPositions,
  areAdjacent,
} from '../GridAttack';

// ───── Helpers ─────

function heroUnit(id: string, x: number, y: number, overrides: Partial<GridUnit> = {}): GridUnit {
  return {
    id,
    type: 'hero',
    faction: 'player',
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

function enemyUnit(id: string, x: number, y: number, overrides: Partial<GridUnit> = {}): GridUnit {
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

function summonUnit(id: string, x: number, y: number, overrides: Partial<GridUnit> = {}): GridUnit {
  return {
    id,
    type: 'summon',
    faction: 'player',
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

// ───── Tests ─────

describe('GridAttack', () => {
  describe('getAdjacentPositions', () => {
    it('should return 8 positions for interior tile', () => {
      const positions = getAdjacentPositions({ x: 4, y: 2 });
      expect(positions).toHaveLength(8);
      expect(positions).toContainEqual({ x: 3, y: 1 });
      expect(positions).toContainEqual({ x: 4, y: 1 });
      expect(positions).toContainEqual({ x: 5, y: 1 });
      expect(positions).toContainEqual({ x: 3, y: 2 });
      expect(positions).toContainEqual({ x: 5, y: 2 });
      expect(positions).toContainEqual({ x: 3, y: 3 });
      expect(positions).toContainEqual({ x: 4, y: 3 });
      expect(positions).toContainEqual({ x: 5, y: 3 });
    });

    it('should return 3 positions for corner tile', () => {
      const positions = getAdjacentPositions({ x: 0, y: 0 });
      expect(positions).toHaveLength(3);
      expect(positions).toContainEqual({ x: 1, y: 0 });
      expect(positions).toContainEqual({ x: 0, y: 1 });
      expect(positions).toContainEqual({ x: 1, y: 1 });
    });

    it('should return 5 positions for edge tile', () => {
      const positions = getAdjacentPositions({ x: 0, y: 2 }); // left edge
      expect(positions).toHaveLength(5);
    });
  });

  describe('getOrthogonalAdjacentPositions', () => {
    it('should return 4 positions for interior tile', () => {
      const positions = getOrthogonalAdjacentPositions({ x: 4, y: 2 });
      expect(positions).toHaveLength(4);
      expect(positions).toContainEqual({ x: 4, y: 1 });
      expect(positions).toContainEqual({ x: 3, y: 2 });
      expect(positions).toContainEqual({ x: 5, y: 2 });
      expect(positions).toContainEqual({ x: 4, y: 3 });
    });

    it('should return 2 positions for corner tile', () => {
      const positions = getOrthogonalAdjacentPositions({ x: 0, y: 0 });
      expect(positions).toHaveLength(2);
      expect(positions).toContainEqual({ x: 1, y: 0 });
      expect(positions).toContainEqual({ x: 0, y: 1 });
    });

    it('should not include diagonal positions', () => {
      const positions = getOrthogonalAdjacentPositions({ x: 1, y: 1 });
      expect(positions).not.toContainEqual({ x: 0, y: 0 });
      expect(positions).not.toContainEqual({ x: 2, y: 0 });
      expect(positions).not.toContainEqual({ x: 0, y: 2 });
      expect(positions).not.toContainEqual({ x: 2, y: 2 });
    });
  });

  describe('areAdjacent', () => {
    it('should return true for orthogonal neighbors', () => {
      expect(areAdjacent({ x: 4, y: 2 }, { x: 4, y: 3 })).toBe(true);
      expect(areAdjacent({ x: 4, y: 2 }, { x: 3, y: 2 })).toBe(true);
    });

    it('should return true for diagonal neighbors', () => {
      expect(areAdjacent({ x: 4, y: 2 }, { x: 5, y: 3 })).toBe(true);
      expect(areAdjacent({ x: 4, y: 2 }, { x: 3, y: 1 })).toBe(true);
    });

    it('should return false for same position', () => {
      expect(areAdjacent({ x: 4, y: 2 }, { x: 4, y: 2 })).toBe(false);
    });

    it('should return false for distance of 2', () => {
      expect(areAdjacent({ x: 4, y: 2 }, { x: 4, y: 4 })).toBe(false);
      expect(areAdjacent({ x: 4, y: 2 }, { x: 6, y: 2 })).toBe(false);
    });
  });

  describe('getAttackableTargets', () => {
    it('should return empty array for dead unit', () => {
      const grid = createEmptyGrid();
      const hero = heroUnit('hero', 4, 2, { isAlive: false });
      const g = placeUnit(grid, hero);
      expect(getAttackableTargets(g, 'hero')).toEqual([]);
    });

    it('should return empty array for unknown unit ID', () => {
      const grid = createEmptyGrid();
      expect(getAttackableTargets(grid, 'nonexistent')).toEqual([]);
    });

    it('should let melee unit attack any of 8 adjacent tiles', () => {
      const grid = createEmptyGrid();
      const hero = heroUnit('hero', 4, 2, { attackRange: 1 });
      let g = placeUnit(grid, hero);

      // Place enemies in all 8 surrounding tiles
      const enemies: GridUnit[] = [];
      const dirs = [
        { x: 3, y: 1 }, { x: 4, y: 1 }, { x: 5, y: 1 },
        { x: 3, y: 2 },                   { x: 5, y: 2 },
        { x: 3, y: 3 }, { x: 4, y: 3 }, { x: 5, y: 3 },
      ];
      dirs.forEach((d, i) => {
        const e = enemyUnit(`e${i}`, d.x, d.y);
        enemies.push(e);
        g = placeUnit(g, e);
      });

      const targets = getAttackableTargets(g, 'hero');

      // Should be able to attack all 8 adjacent enemies
      expect(targets).toHaveLength(8);
      for (let i = 0; i < 8; i++) {
        expect(targets).toContain(`e${i}`);
      }
    });

    it('should let melee unit attack diagonal enemies', () => {
      const grid = createEmptyGrid();
      const hero = heroUnit('hero', 4, 2, { attackRange: 1 });
      const enemy = enemyUnit('e1', 5, 3); // diagonal
      let g = placeUnit(grid, hero);
      g = placeUnit(g, enemy);

      const targets = getAttackableTargets(g, 'hero');
      expect(targets).toContain('e1');
    });

    it('should NOT let melee unit attack a unit 2 tiles away', () => {
      const grid = createEmptyGrid();
      const hero = heroUnit('hero', 4, 2, { attackRange: 1 });
      const enemy = enemyUnit('e1', 4, 4); // 2 tiles away orthogonally
      let g = placeUnit(grid, hero);
      g = placeUnit(g, enemy);

      const targets = getAttackableTargets(g, 'hero');
      expect(targets).not.toContain('e1');
      expect(targets).toHaveLength(0);
    });

    it('should let ranged unit attack units within Manhattan distance', () => {
      const grid = createEmptyGrid();
      const hero = heroUnit('hero', 4, 2, { attackRange: 3 });
      let g = placeUnit(grid, hero);

      // Enemy within range (Manhattan distance = 2)
      const enemy1 = enemyUnit('e1', 4, 0);
      g = placeUnit(g, enemy1);
      expect(getManhattanDistance({ x: 4, y: 2 }, { x: 4, y: 0 })).toBe(2);

      // Enemy at range limit (Manhattan distance = 3)
      const enemy2 = enemyUnit('e2', 7, 2);
      g = placeUnit(g, enemy2);
      expect(getManhattanDistance({ x: 4, y: 2 }, { x: 7, y: 2 })).toBe(3);

      const targets = getAttackableTargets(g, 'hero');
      expect(targets).toContain('e1');
      expect(targets).toContain('e2');
    });

    it('should NOT let ranged unit attack units beyond range', () => {
      const grid = createEmptyGrid();
      const hero = heroUnit('hero', 4, 2, { attackRange: 2 });
      let g = placeUnit(grid, hero);

      // Enemy at Manhattan distance 4 — beyond range
      const enemy = enemyUnit('e1', 0, 2);
      g = placeUnit(g, enemy);

      const targets = getAttackableTargets(g, 'hero');
      expect(targets).not.toContain('e1');
      expect(targets).toHaveLength(0);
    });

    it('should NOT allow attacking own position', () => {
      const grid = createEmptyGrid();
      // We can't actually have a unit other than ourselves at our position,
      // but let's verify that the attacker doesn't target themselves
      const hero = heroUnit('hero', 4, 2, { attackRange: 3 });
      const g = placeUnit(grid, hero);

      const targets = getAttackableTargets(g, 'hero');
      expect(targets).not.toContain('hero');
    });

    it('should block ranged attack through walls', () => {
      const grid = createEmptyGrid();
      const hero = heroUnit('hero', 0, 0, { attackRange: 5 });
      let g = placeUnit(grid, hero);

      // Enemy on the other side of a wall
      const enemy = enemyUnit('e1', 3, 0);
      g = placeUnit(g, enemy);

      // Place wall at (1,0) — blocks line of sight
      g.tiles[0][1].type = TileType.Wall;

      const targets = getAttackableTargets(g, 'hero');
      expect(targets).not.toContain('e1');
      expect(targets).toHaveLength(0);
    });

    it('should NOT block melee attack by walls (melee doesn\'t check LOS)', () => {
      const grid = createEmptyGrid();
      const hero = heroUnit('hero', 0, 0, { attackRange: 1 });
      let g = placeUnit(grid, hero);

      const enemy = enemyUnit('e1', 1, 0);
      g = placeUnit(g, enemy);

      // Wall between them doesn't matter for melee
      g.tiles[0][0].type = TileType.Wall;

      const targets = getAttackableTargets(g, 'hero');
      expect(targets).toContain('e1');
    });

    // ───── Faction Tests (C1) ─────

    it('should NOT include friendly units as targets', () => {
      const grid = createEmptyGrid();
      const hero = heroUnit('hero', 4, 2);
      const ally = heroUnit('ally', 4, 3); // same faction
      let g = placeUnit(grid, hero);
      g = placeUnit(g, ally);

      const targets = getAttackableTargets(g, 'hero');

      // Friendly hero is not a valid target
      expect(targets).not.toContain('ally');
      expect(targets).toHaveLength(0);
    });

    it('should NOT include summon units as targets for hero (same faction)', () => {
      const grid = createEmptyGrid();
      const hero = heroUnit('hero', 4, 2);
      const summon = summonUnit('summon', 4, 3);
      let g = placeUnit(grid, hero);
      g = placeUnit(g, summon);

      const targets = getAttackableTargets(g, 'hero');

      // Summon is same faction — not targetable
      expect(targets).not.toContain('summon');
    });

    it('should include enemy units as targets', () => {
      const grid = createEmptyGrid();
      const hero = heroUnit('hero', 4, 2);
      const enemy = enemyUnit('e1', 5, 2);
      let g = placeUnit(grid, hero);
      g = placeUnit(g, enemy);

      const targets = getAttackableTargets(g, 'hero');

      expect(targets).toContain('e1');
    });
  });

  describe('canAttack', () => {
    it('should return true for melee attacking adjacent target', () => {
      const grid = createEmptyGrid();
      const hero = heroUnit('hero', 4, 2, { attackRange: 1 });
      const enemy = enemyUnit('e1', 5, 2);
      let g = placeUnit(grid, hero);
      g = placeUnit(g, enemy);

      expect(canAttack(g, 'hero', 'e1')).toBe(true);
    });

    it('should return false for melee attacking non-adjacent target', () => {
      const grid = createEmptyGrid();
      const hero = heroUnit('hero', 4, 2, { attackRange: 1 });
      const enemy = enemyUnit('e1', 4, 4);
      let g = placeUnit(grid, hero);
      g = placeUnit(g, enemy);

      expect(canAttack(g, 'hero', 'e1')).toBe(false);
    });

    it('should return true for ranged attacking target within range and LOS', () => {
      const grid = createEmptyGrid();
      const hero = heroUnit('hero', 0, 0, { attackRange: 3 });
      const enemy = enemyUnit('e1', 3, 0);
      let g = placeUnit(grid, hero);
      g = placeUnit(g, enemy);

      expect(canAttack(g, 'hero', 'e1')).toBe(true);
    });

    it('should return false for ranged attacking target behind wall', () => {
      const grid = createEmptyGrid();
      const hero = heroUnit('hero', 0, 0, { attackRange: 5 });
      const enemy = enemyUnit('e1', 3, 0);
      let g = placeUnit(grid, hero);
      g = placeUnit(g, enemy);
      g.tiles[0][1].type = TileType.Wall;

      expect(canAttack(g, 'hero', 'e1')).toBe(false);
    });

    it('should return false if attacker is dead', () => {
      const grid = createEmptyGrid();
      const hero = heroUnit('hero', 4, 2, { attackRange: 1, isAlive: false });
      const enemy = enemyUnit('e1', 5, 2);
      let g = placeUnit(grid, hero);
      g = placeUnit(g, enemy);

      expect(canAttack(g, 'hero', 'e1')).toBe(false);
    });

    it('should return false if target is dead', () => {
      const grid = createEmptyGrid();
      const hero = heroUnit('hero', 4, 2, { attackRange: 1 });
      const enemy = enemyUnit('e1', 5, 2, { isAlive: false });
      let g = placeUnit(grid, hero);
      g = placeUnit(g, enemy);

      expect(canAttack(g, 'hero', 'e1')).toBe(false);
    });

    it('should return false if target is the attacker', () => {
      const grid = createEmptyGrid();
      const hero = heroUnit('hero', 4, 2);
      const g = placeUnit(grid, hero);

      expect(canAttack(g, 'hero', 'hero')).toBe(false);
    });

    it('should return false if unit IDs do not exist', () => {
      const grid = createEmptyGrid();
      expect(canAttack(grid, 'nonexistent', 'alsononexistent')).toBe(false);
    });

    // ───── Faction Tests (C1) ─────

    it('should NOT allow attacking friendly units', () => {
      const grid = createEmptyGrid();
      const hero = heroUnit('hero', 4, 2);
      const ally = heroUnit('ally', 5, 2);
      let g = placeUnit(grid, hero);
      g = placeUnit(g, ally);

      expect(canAttack(g, 'hero', 'ally')).toBe(false);
    });

    it('should NOT allow attacking self (already verified above, added for completeness)', () => {
      const grid = createEmptyGrid();
      const hero = heroUnit('hero', 4, 2);
      const g = placeUnit(grid, hero);

      expect(canAttack(g, 'hero', 'hero')).toBe(false);
    });

    it('should allow attacking enemy units', () => {
      const grid = createEmptyGrid();
      const hero = heroUnit('hero', 4, 2);
      const enemy = enemyUnit('e1', 5, 2);
      let g = placeUnit(grid, hero);
      g = placeUnit(g, enemy);

      expect(canAttack(g, 'hero', 'e1')).toBe(true);
    });
  });
});
