import type { EnemyStepKind } from "../enums/enemy-step-kind.enum"

/**
 * What a unit intends to do on its turn — the primary action extracted from
 * the AI planner's steps. Stored in GameState at the start of each player
 * turn so the UI can show intention icons above enemy heads.
 */
export interface EnemyIntention {
  kind: EnemyStepKind
  /** target unit id when the intention involves a specific enemy/fish */
  targetId?: string
  /** card definition id when kind === CastCard */
  cardId?: string
}