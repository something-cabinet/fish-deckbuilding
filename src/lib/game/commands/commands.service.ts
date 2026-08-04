import type { FxEvent, GameState, Pos } from "../battle/models"
import { castCard, moveUnit, sellCard, unitAttack } from "../actions/actions.service"
import { startEnemyPhase } from "../battle/services"

/* ------------------------------------------------------------------ */
/* Command base (D7, D9)                                               */
/*                                                                     */
/* Every player action is a data-parameterized command — no per-action */
/* command classes. Commands are plain serializable data (deterministic*/
/* replay / logging seam per StS2 GameActionQueue).                    */
/* ------------------------------------------------------------------ */

export type PlayerCommand =
  | { kind: "move"; unitId: string; dest: Pos }
  | { kind: "attack"; attackerId: string; targetId: string }
  | { kind: "playCard"; cardUid: string; target: { unitId?: string; tile?: Pos } }
  | { kind: "sell"; cardUid: string }
  | { kind: "endTurn" }

export interface CommandResult {
  state: GameState
  fx: FxEvent[]
}

/** Execute a single command against a state, producing the next state + fx. */
export function executeCommand(state: GameState, cmd: PlayerCommand): CommandResult {
  switch (cmd.kind) {
    case "move":
      return moveUnit(state, cmd.unitId, cmd.dest)
    case "attack":
      return unitAttack(state, cmd.attackerId, cmd.targetId)
    case "playCard":
      return castCard(state, cmd.cardUid, cmd.target)
    case "sell":
      return { state: sellCard(state, cmd.cardUid), fx: [] }
    case "endTurn":
      // D10: end turn commits — transitions to the enemy phase; undo history
      // is cleared by the history layer (T8), not here.
      return { state: startEnemyPhase(state), fx: [] }
  }
}

/* ------------------------------------------------------------------ */
/* Ordered command queue (D9)                                          */
/*                                                                     */
/* Executes commands deterministically in enqueue order. Replaying the */
/* same command sequence against a fresh state produces identical      */
/* transitions (AC-12, Scenario 12).                                   */
/* ------------------------------------------------------------------ */

export class CommandQueue {
  private pending: PlayerCommand[] = []

  get length(): number {
    return this.pending.length
  }

  enqueue(cmd: PlayerCommand): void {
    this.pending.push(cmd)
  }

  /** Execute all pending commands in order against the given state. */
  drain(state: GameState): { results: CommandResult[]; state: GameState } {
    let s = state
    const results: CommandResult[] = []
    for (const cmd of this.pending) {
      const r = executeCommand(s, cmd)
      results.push(r)
      s = r.state
    }
    this.pending = []
    return { results, state: s }
  }

  /** Serialize pending commands as plain data (logging/replay seam). */
  snapshot(): PlayerCommand[] {
    return [...this.pending]
  }
}
