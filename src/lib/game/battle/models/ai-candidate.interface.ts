import type { AiScorer } from "../../units/enums/ai-scorer.enum"
import type { Pos } from "./pos.interface"

/**
 * One fully-formed thing a unit could do this turn: end on `dest`, optionally
 * attacking `targetId` from there. The planner enumerates every legal
 * candidate, scores them all, and keeps the best — so "AI behaviour" is a
 * comparison over data rather than a branch tree.
 *
 * `scores` holds the *raw* per-scorer values before weighting, which is what
 * makes a decision explainable after the fact.
 */
export interface AiCandidate {
  unitId: string
  /** tile the unit ends on; equals its current position when it stands still */
  dest: Pos
  /** tiles walked to reach `dest`, excluding the starting tile */
  path: Pos[]
  /** absent when the candidate is a pure reposition */
  targetId?: string
  damage: number
  scores: Record<AiScorer, number>
  /** weighted sum of `scores` — the number the planner actually maximises */
  total: number
}
