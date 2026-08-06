import { EnemyPackSchema } from "./enemy-schema.helper"
import type { EnemyDef } from "../models/enemy-def.interface"
import enemyDb from "./enemy-database.json"

/**
 * Authored enemy templates, validated at module load like CARD_LIBRARY.
 * Stages reference these by id, so editing a template here changes every
 * stage that places it.
 */
export const ENEMY_LIBRARY: EnemyDef[] = EnemyPackSchema.parse(enemyDb).enemies
