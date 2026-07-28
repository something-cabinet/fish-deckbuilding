/**
 * Core data types for the 9×5 tactical grid system.
 *
 * All grid logic follows a pure-function pattern: state-in, state-out, no side effects.
 * The grid is indexed as tiles[y][x] where row 0 is the top row and column 0 is the left column.
 *
 * Grid dimensions: width = 9, height = 5
 */

// ───── Enums ─────

/** Tile terrain types that affect movement and line of sight. */
export enum TileType {
  Floor = 'floor',
  Water = 'water',
  Sand = 'sand',
  Stone = 'stone',
  Wall = 'wall', // impassable, blocks line of sight
}

/** Movement capability of a unit. */
export enum MoveType {
  /** Standard movement: 2-tile budget, diagonal costs 2, respects blocking. */
  Normal = 'normal',
  /** Unrestricted movement: can reach any unoccupied tile on the board. */
  Flying = 'flying',
}

// ───── Interfaces ─────

/** A position on the 9×5 grid. x: 0-8 (column), y: 0-4 (row). */
export interface GridPosition {
  x: number;
  y: number;
}

/** A single tile on the grid. */
export interface GridTile {
  position: GridPosition;
  type: TileType;
  /** ID of the unit occupying this tile, or null if empty. */
  occupiedBy: string | null;
}

/** A unit placed on the grid (used by the grid system for spatial queries). */
export interface GridUnit {
  id: string;
  type: 'hero' | 'enemy' | 'summon';
  position: GridPosition;
  faction: 'player' | 'enemy';
  moveType: MoveType;
  /** Movement budget in tiles (default 2). Orthogonal = 1, diagonal = 2. */
  moveRange: number;
  /** 1 = melee, 2+ = ranged. */
  attackRange: number;
  hasProvoke: boolean;
  hasActed: boolean;
  hasMoved: boolean;
  hasAttacked: boolean;
  isAlive: boolean;
}

// ───── Constants ─────

/** Default grid width (columns). */
export const GRID_WIDTH = 9;
/** Default grid height (rows). */
export const GRID_HEIGHT = 5;

/** The complete grid state for pure-function transformations. */
export interface GridState {
  /** Tiles indexed as tiles[row][column], i.e. tiles[y][x]. */
  tiles: GridTile[][];
  /** Map of unit ID → GridUnit for fast lookup. */
  units: Map<string, GridUnit>;
  width: number; // 9
  height: number; // 5
}
