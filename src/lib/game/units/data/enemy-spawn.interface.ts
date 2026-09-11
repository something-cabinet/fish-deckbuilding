import type { UnitKind } from "../enums"
import type { EnemyAiProfile } from "../models/ai-profile.interface"

export interface EnemySpawn {
  name: string
  kind: UnitKind
  x: number
  y: number
  hp: number
  atk: number
  move: number
  /** attack range from the enemy template; defaults to 1 (melee) */
  range?: number
  /** AI tuning from the enemy template; defaults to DEFAULT_AI_PROFILE */
  aiProfile?: EnemyAiProfile
  /** authored deck from the enemy template: card id -> count */
  deck?: { id: string; count: number }[]
  /** enemy library id for looking up card pool at battle start */
  templateId?: string
}
