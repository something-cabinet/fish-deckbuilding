import type { EnemyStepKind } from "../enums/enemy-step-kind.enum"
import type { Pos } from "./pos.interface"

/** One atomic, animatable beat of the enemy phase, produced by the planner. */
export interface EnemyStep {
  kind: EnemyStepKind
  unitId: string
  from?: Pos
  to?: Pos
  targetId?: string
  amount?: number
}
