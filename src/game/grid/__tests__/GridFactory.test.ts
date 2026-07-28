import { describe, it, expect } from 'vitest';
import { MoveType, TileType, GRID_WIDTH, GRID_HEIGHT } from '../GridTypes';
import type { GridUnit } from '../GridTypes';
import {
  createEmptyGrid,
  placeUnit,
  removeUnit,
  moveUnit,
  cloneGrid,
  withTerrain,
  areEnemies,
  isOccupied,
  getUnitAt,
} from '../GridFactory';

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

describe('GridFactory', () => {
  describe('createEmptyGrid', () => {
    it('should create grid with default dimensions (9×5)', () => {
      const grid = createEmptyGrid();
      expect(grid.tiles).toHaveLength(GRID_HEIGHT);
      expect(grid.tiles[0]).toHaveLength(GRID_WIDTH);
      expect(grid.width).toBe(GRID_WIDTH);
      expect(grid.height).toBe(GRID_HEIGHT);
    });

    it('should create grid with custom dimensions', () => {
      const grid = createEmptyGrid(6, 4);
      expect(grid.tiles).toHaveLength(4);
      expect(grid.tiles[0]).toHaveLength(6);
    });

    it('should fill all tiles with Floor type', () => {
      const grid = createEmptyGrid();
      for (let y = 0; y < grid.height; y++) {
        for (let x = 0; x < grid.width; x++) {
          expect(grid.tiles[y][x].type).toBe(TileType.Floor);
        }
      }
    });

    it('should have no occupied tiles and empty units map', () => {
      const grid = createEmptyGrid();
      expect(grid.units.size).toBe(0);
      for (let y = 0; y < grid.height; y++) {
        for (let x = 0; x < grid.width; x++) {
          expect(grid.tiles[y][x].occupiedBy).toBeNull();
        }
      }
    });
  });

  describe('placeUnit', () => {
    it('should set occupancy on the target tile', () => {
      const grid = createEmptyGrid();
      const unit = heroUnit('hero', 4, 2);
      const next = placeUnit(grid, unit);

      expect(next.tiles[2][4].occupiedBy).toBe('hero');
      expect(next.units.get('hero')).toBeDefined();
    });

    it('should throw when placing on occupied tile', () => {
      const grid = createEmptyGrid();
      const unit1 = heroUnit('hero', 4, 2);
      const unit2 = enemyUnit('e1', 4, 2);
      const g = placeUnit(grid, unit1);

      expect(() => placeUnit(g, unit2)).toThrow('already occupied');
    });

    it('should throw when placing out of bounds', () => {
      const grid = createEmptyGrid();
      const unit = heroUnit('hero', -1, 0);

      expect(() => placeUnit(grid, unit)).toThrow('out of bounds');
    });

    it('should throw when placing out of bounds (beyond width)', () => {
      const grid = createEmptyGrid();
      const unit = heroUnit('hero', GRID_WIDTH, 0);

      expect(() => placeUnit(grid, unit)).toThrow('out of bounds');
    });
  });

  describe('removeUnit', () => {
    it('should clear occupancy and remove unit from map', () => {
      const grid = createEmptyGrid();
      const unit = heroUnit('hero', 4, 2);
      const g = placeUnit(grid, unit);
      const next = removeUnit(g, 'hero');

      expect(next.tiles[2][4].occupiedBy).toBeNull();
      expect(next.units.has('hero')).toBe(false);
    });

    it('should throw when removing non-existent unit', () => {
      const grid = createEmptyGrid();
      expect(() => removeUnit(grid, 'nonexistent')).toThrow('not found');
    });
  });

  describe('moveUnit', () => {
    it('should change position and occupancy', () => {
      const grid = createEmptyGrid();
      const unit = heroUnit('hero', 4, 2);
      const g = placeUnit(grid, unit);
      const next = moveUnit(g, 'hero', { x: 4, y: 3 });

      // Old position cleared
      expect(next.tiles[2][4].occupiedBy).toBeNull();
      // New position occupied
      expect(next.tiles[3][4].occupiedBy).toBe('hero');
      // Unit position updated
      expect(next.units.get('hero')!.position).toEqual({ x: 4, y: 3 });
    });

    it('should set hasMoved=true on the moved unit', () => {
      const grid = createEmptyGrid();
      const unit = heroUnit('hero', 4, 2, { hasMoved: false });
      const g = placeUnit(grid, unit);
      const next = moveUnit(g, 'hero', { x: 4, y: 3 });

      expect(next.units.get('hero')!.hasMoved).toBe(true);
    });

    it('should throw when moving to occupied destination', () => {
      const grid = createEmptyGrid();
      const unit1 = heroUnit('hero', 4, 2);
      const unit2 = enemyUnit('e1', 4, 3);
      let g = placeUnit(grid, unit1);
      g = placeUnit(g, unit2);

      expect(() => moveUnit(g, 'hero', { x: 4, y: 3 })).toThrow('already occupied');
    });

    it('should throw when moving non-existent unit', () => {
      const grid = createEmptyGrid();
      expect(() => moveUnit(grid, 'nobody', { x: 0, y: 0 })).toThrow('not found');
    });
  });

  describe('cloneGrid', () => {
    it('should produce an independent copy', () => {
      const grid = createEmptyGrid();
      const unit = heroUnit('hero', 4, 2);
      const g = placeUnit(grid, unit);
      const clone = cloneGrid(g);

      // Mutate clone
      clone.tiles[2][4].occupiedBy = null;
      clone.units.delete('hero');

      // Original should be unaffected
      expect(g.tiles[2][4].occupiedBy).toBe('hero');
      expect(g.units.has('hero')).toBe(true);
    });
  });

  describe('withTerrain', () => {
    it('should modify specified tiles', () => {
      const grid = createEmptyGrid();
      const next = withTerrain(grid, [
        { x: 0, y: 0, type: TileType.Wall },
        { x: 4, y: 2, type: TileType.Water },
      ]);

      expect(next.tiles[0][0].type).toBe(TileType.Wall);
      expect(next.tiles[2][4].type).toBe(TileType.Water);
      // Other tiles unchanged
      expect(next.tiles[1][1].type).toBe(TileType.Floor);
    });

    it('should return a new grid (does not mutate original)', () => {
      const grid = createEmptyGrid();
      const next = withTerrain(grid, [{ x: 0, y: 0, type: TileType.Wall }]);

      expect(next).not.toBe(grid);
      expect(grid.tiles[0][0].type).toBe(TileType.Floor);
    });
  });

  describe('areEnemies', () => {
    it('should return true for hero vs enemy', () => {
      const hero = heroUnit('hero', 0, 0);
      const enemy = enemyUnit('e1', 1, 1);
      expect(areEnemies(hero, enemy)).toBe(true);
    });

    it('should return true for summon vs enemy', () => {
      const summon = summonUnit('summon', 0, 0);
      const enemy = enemyUnit('e1', 1, 1);
      expect(areEnemies(summon, enemy)).toBe(true);
    });

    it('should return false for hero vs summon (same side)', () => {
      const hero = heroUnit('hero', 0, 0);
      const summon = summonUnit('summon', 1, 1);
      expect(areEnemies(hero, summon)).toBe(false);
    });

    it('should return false for enemy vs enemy (same side)', () => {
      const e1 = enemyUnit('e1', 0, 0);
      const e2 = enemyUnit('e2', 1, 1);
      expect(areEnemies(e1, e2)).toBe(false);
    });

    it('should return false for hero vs hero (same side)', () => {
      const h1 = heroUnit('h1', 0, 0);
      const h2 = heroUnit('h2', 1, 1);
      expect(areEnemies(h1, h2)).toBe(false);
    });
  });
});
