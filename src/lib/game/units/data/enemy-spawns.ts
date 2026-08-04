import { UnitKind } from "../enums"
import type { EnemySpawn } from "./enemy-spawn.interface"

export const ENEMY_SPAWNS: EnemySpawn[] = [
  { name: "Thug", kind: UnitKind.Thug, x: 6, y: 1, hp: 4, atk: 2, move: 2 },
  { name: "Thug", kind: UnitKind.Thug, x: 6, y: 3, hp: 4, atk: 2, move: 2 },
  { name: "Enforcer", kind: UnitKind.Enforcer, x: 7, y: 0, hp: 6, atk: 3, move: 2 },
  { name: "Enforcer", kind: UnitKind.Enforcer, x: 7, y: 4, hp: 6, atk: 3, move: 2 },
  { name: "The Boss", kind: UnitKind.Boss, x: 8, y: 2, hp: 16, atk: 4, move: 1 },
]
