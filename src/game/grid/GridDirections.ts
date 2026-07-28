/**
 * Shared direction constants for grid movement and adjacency logic.
 *
 * Centralised here to eliminate duplicate definitions across modules.
 */
export const ALL_DIRECTIONS: [number, number][] = [
  [-1, -1], [0, -1], [1, -1],
  [-1,  0],          [1,  0],
  [-1,  1], [0,  1], [1,  1],
];

export const ORTHOGONAL_DIRECTIONS: [number, number][] = [
  [0, -1], [-1, 0], [1, 0], [0, 1],
];

export const DIAGONAL_DIRECTIONS: [number, number][] = [
  [-1, -1], [1, -1], [-1, 1], [1, 1],
];
