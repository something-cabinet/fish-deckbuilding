
pub const GRID_WIDTH: i32 = 9;
pub const GRID_HEIGHT: i32 = 5;
pub const MOVE_BUDGET: i32 = 2;


pub const START_MANA: i32 = 1;
pub const MAX_MANA: i32 = 9;


pub const HERO_HP: i32 = 30;
pub const HERO_ATK: i32 = 2;
pub const HERO_START: (i32, i32) = (0, 2);


pub const ENEMY_HP: i32 = 10;
pub const ENEMY_ATK: i32 = 2;
pub const ENEMY_START: (i32, i32) = (8, 2);


pub const TILE_SIZE: i32 = 80;
pub const GRID_ORIGIN_X: i32 = 280;
pub const GRID_ORIGIN_Y: i32 = 160;

#[cfg(test)]
mod tests {
    #[test]
    fn grid_is_9x5() {
        assert_eq!(super::GRID_WIDTH, 9);
        assert_eq!(super::GRID_HEIGHT, 5);
    }

    #[test]
    fn enemy_start_is_at_8_2() {
        assert_eq!(super::ENEMY_START, (8, 2));
    }
}
