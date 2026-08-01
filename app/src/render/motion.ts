// Motion helpers for the board renderer (P4). Pure functions + timing constants
// from the locked animate thesis (deepwork state file): timing ladder
// 100–150ms feedback / 150–300 routine / 300–500 overlay / 500–800 authored
// entrance; easeOutCubic (cubic-bezier(0.16,1,0.3,1)); walk 300ms/tile;
// merge window 150ms; drama threshold ≥7; shake 350ms non-stacking.

export const TILE_WALK_MS = 300; // per tile
export const MERGE_WINDOW_MS = 150; // floating-number merge (100–200ms band)
export const DRAMA_THRESHOLD = 7; // single hit ≥7 triggers shake + zoom
export const SHAKE_MS = 350;
export const SHAKE_AMPLITUDE = 8; // px peak
export const ZOOM_AMOUNT = 0.025; // 2.5% focus zoom
export const FLOAT_MS = 900; // float+fade duration (0.6–1.2s band)
export const FLOAT_RISE = 34; // px rise
export const FLOAT_JITTER = 24; // ±px horizontal jitter (20–40px band)
export const BADGE_ENTER_MS = 650; // authored telegraph entrance (500–800ms)
export const STORY_ENTER_MS = 650; // end-scene entrance
export const MAX_TRANSIENTS = 20; // NFR-2 FX budget

export function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

/** Walk duration for a move across n tiles: 300ms per tile. */
export function tweenDurationForTiles(nTiles: number): number {
  return Math.max(TILE_WALK_MS, nTiles * TILE_WALK_MS);
}

/** Progress 0..1 for a tween that started at `start` (performance.now()-based), clamped. */
export function tweenProgress(start: number, duration: number, now: number): number {
  return Math.min(1, Math.max(0, (now - start) / duration));
}

/** Small deterministic jitter for floating numbers (±FLOAT_JITTER), centered. */
export function floatJitter(seed: number): number {
  const r = (seed * 2654435761) % 9973;
  return ((r / 9973) * 2 - 1) * FLOAT_JITTER;
}
