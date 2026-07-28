// Game-wide constants. Single source of truth for dimensions, stats, and colors.
// ── Grid ────────────────────────────────────────────────────────────────────

pub const GRID_WIDTH: i32 = 6;
pub const GRID_HEIGHT: i32 = 4;
pub const MOVE_BUDGET: i32 = 2;

// ── Mana ────────────────────────────────────────────────────────────────────

pub const START_MANA: i32 = 3;
pub const MAX_MANA: i32 = 3;

// ── Hero ────────────────────────────────────────────────────────────────────

pub const HERO_HP: i32 = 30;
pub const HERO_ATK: i32 = 2;
pub const HERO_START: (i32, i32) = (0, 2);

// ── Enemy ("Debt Collector") ────────────────────────────────────────────────

pub const ENEMY_HP: i32 = 10;
pub const ENEMY_ATK: i32 = 2;
pub const ENEMY_START: (i32, i32) = (5, 1);

// ── Visual (used by scene layer, defined here for single source of truth) ──

pub const TILE_SIZE: i32 = 80;
pub const GRID_ORIGIN_X: i32 = 400;
pub const GRID_ORIGIN_Y: i32 = 180;
