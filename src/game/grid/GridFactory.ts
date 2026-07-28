/**
 * Grid factory and helper functions.
 *
 * All functions are pure — they return new state rather than mutating inputs.
 */
import type { GridPosition, GridState, GridTile, GridUnit } from './GridTypes';
import { TileType, GRID_WIDTH, GRID_HEIGHT } from './GridTypes';

// ───── Factory ─────

/**
 * Create an empty grid of the given dimensions filled with Floor tiles.
 * Width and height default to GRID_WIDTH × GRID_HEIGHT (9×5).
 */
export function createEmptyGrid(width: number = GRID_WIDTH, height: number = GRID_HEIGHT): GridState {
  const tiles: GridTile[][] = [];

  for (let y = 0; y < height; y++) {
    const row: GridTile[] = [];
    for (let x = 0; x < width; x++) {
      row.push({
        position: { x, y },
        type: TileType.Floor,
        occupiedBy: null,
      });
    }
    tiles.push(row);
  }

  return {
    tiles,
    units: new Map<string, GridUnit>(),
    width,
    height,
  };
}

// ───── Query Helpers ─────

/**
 * Check if a position is within the grid bounds (x: 0-8, y: 0-4 for default grid).
 */
export function isInBounds(pos: GridPosition, grid?: { width: number; height: number }): boolean {
  const w = grid?.width ?? GRID_WIDTH;
  const h = grid?.height ?? GRID_HEIGHT;
  return pos.x >= 0 && pos.x < w && pos.y >= 0 && pos.y < h;
}

/**
 * Check if a tile is occupied by any unit.
 */
export function isOccupied(grid: GridState, pos: GridPosition): boolean {
  if (!isInBounds(pos, grid)) return false;
  return grid.tiles[pos.y][pos.x].occupiedBy !== null;
}

/**
 * Get the unit at a given position, or null if the tile is empty or out of bounds.
 */
export function getUnitAt(grid: GridState, pos: GridPosition): GridUnit | null {
  if (!isInBounds(pos, grid)) return null;
  const unitId = grid.tiles[pos.y][pos.x].occupiedBy;
  if (unitId === null) return null;
  return grid.units.get(unitId) ?? null;
}

// ───── Faction Helpers ─────

/**
 * Check if two units are on opposite sides.
 * 'hero' and 'summon' types are player-side; 'enemy' type is enemy-side.
 * Returns true if one is player-side and the other is enemy-side.
 */
export function areEnemies(a: GridUnit, b: GridUnit): boolean {
  const aIsPlayer = a.type === 'hero' || a.type === 'summon';
  const bIsPlayer = b.type === 'hero' || b.type === 'summon';
  return aIsPlayer !== bIsPlayer;
}

// ───── Terrain Helpers ─────

/** Return a new tile with the given terrain type (pure). */
function setTileType(tile: GridTile, type: TileType): GridTile {
  return { ...tile, type };
}

/**
 * Return a cloned grid with specific tiles' terrain types modified.
 * Pure function — does not mutate the original grid.
 */
export function withTerrain(
  grid: GridState,
  modifications: { x: number; y: number; type: TileType }[],
): GridState {
  const next = cloneGrid(grid);
  for (const mod of modifications) {
    next.tiles[mod.y][mod.x] = setTileType(next.tiles[mod.y][mod.x], mod.type);
  }
  return next;
}

// ───── Mutation Helpers (return new state) ─────

/**
 * Deep-clone the entire grid state (tiles array + units map).
 * This is the foundation for the pure-function pattern.
 */
export function cloneGrid(grid: GridState): GridState {
  const tiles: GridTile[][] = grid.tiles.map(row =>
    row.map(tile => ({
      ...tile,
      position: { ...tile.position },
      occupiedBy: tile.occupiedBy, // string is immutable
    })),
  );

  const units = new Map<string, GridUnit>();
  for (const [id, unit] of grid.units) {
    units.set(id, {
      ...unit,
      position: { ...unit.position },
    });
  }

  return {
    tiles,
    units,
    width: grid.width,
    height: grid.height,
  };
}

/**
 * Place a unit on the grid at its position.
 * Returns a new grid state. Errors if the tile is out of bounds or already occupied.
 */
export function placeUnit(grid: GridState, unit: GridUnit): GridState {
  const { x, y } = unit.position;

  if (!isInBounds(unit.position, grid)) {
    throw new Error(`Position (${x}, ${y}) is out of bounds`);
  }

  if (grid.tiles[y][x].occupiedBy !== null) {
    throw new Error(`Tile (${x}, ${y}) is already occupied by ${grid.tiles[y][x].occupiedBy}`);
  }

  const next = cloneGrid(grid);
  next.tiles[y][x].occupiedBy = unit.id;
  next.units.set(unit.id, { ...unit, position: { ...unit.position } });
  return next;
}

/**
 * Remove a unit from the grid by ID.
 * Returns a new grid state. Throws if the unit doesn't exist.
 */
export function removeUnit(grid: GridState, unitId: string): GridState {
  const unit = grid.units.get(unitId);
  if (!unit) throw new Error(`Unit "${unitId}" not found on grid`);

  const next = cloneGrid(grid);
  const { x, y } = unit.position;
  next.tiles[y][x].occupiedBy = null;
  next.units.delete(unitId);
  return next;
}

/**
 * Move a unit to a new position on the grid.
 * Returns a new grid state. Errors if the target is out of bounds or occupied.
 * Throws if the unit doesn't exist.
 */
export function moveUnit(grid: GridState, unitId: string, to: GridPosition): GridState {
  const unit = grid.units.get(unitId);
  if (!unit) throw new Error(`Unit "${unitId}" not found on grid`);

  if (!isInBounds(to, grid)) {
    throw new Error(`Target position (${to.x}, ${to.y}) is out of bounds`);
  }

  if (grid.tiles[to.y][to.x].occupiedBy !== null) {
    throw new Error(`Target tile (${to.x}, ${to.y}) is already occupied`);
  }

  const next = cloneGrid(grid);

  // Clear old position
  const oldPos = next.units.get(unitId)!.position;
  next.tiles[oldPos.y][oldPos.x].occupiedBy = null;

  // Set new position
  next.tiles[to.y][to.x].occupiedBy = unitId;
  next.units.get(unitId)!.position = { ...to };
  next.units.get(unitId)!.hasMoved = true;

  return next;
}
