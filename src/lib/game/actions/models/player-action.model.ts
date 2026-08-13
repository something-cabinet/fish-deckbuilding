import type { Pos } from "../../battle/models"

/**
 * Every player action is a plain-data union dispatched through the reducer
 * (D1/FR-1) — no per-action classes, no queue, no session. Same data shapes
 * as the actions the former command layer wrapped; now owned by the actions
 * layer.
 */
export type PlayerAction =
  | { kind: "move"; unitId: string; dest: Pos }
  | { kind: "attack"; attackerId: string; targetId: string }
  | { kind: "playCard"; cardUid: string; target: { unitId?: string; tile?: Pos } }
  | { kind: "sell"; cardUid: string }
  | { kind: "endTurn" }
