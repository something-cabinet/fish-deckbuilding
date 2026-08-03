import type { GameState } from "../battle"
import { CommandQueue, executeCommand } from "./commands.service"
import type { CommandResult, PlayerCommand } from "./commands.service"

/* ------------------------------------------------------------------ */
/* GameSession — snapshot-based undo/redo history (D10, FR-10/FR-11)   */
/*                                                                     */
/* Every executed command pushes the pre-action GameState snapshot     */
/* (Memento — the project's snapshot-sync mechanism). undo() pops the  */
/* snapshot, restoring the exact prior state; a new action after undo  */
/* discards the redo tail. End Turn commits: history clears, and       */
/* enemy-phase steps never enter the undo stack.                       */
/* ------------------------------------------------------------------ */

export class GameSession {
  private past: GameState[] = []
  private future: GameState[] = []
  private queue = new CommandQueue()

  get canUndo(): boolean {
    return this.past.length > 0
  }

  get canRedo(): boolean {
    return this.future.length > 0
  }

  /** Enqueue a player command; executed on the next drain/execute. */
  enqueue(cmd: PlayerCommand): void {
    this.queue.enqueue(cmd)
  }

  /** Execute all queued commands, snapshotting pre-action state per command. */
  drain(state: GameState): { results: CommandResult[]; state: GameState } {
    let s = state
    const results: CommandResult[] = []
    const pending = this.queue.snapshot()
    this.queue = new CommandQueue()
    for (const cmd of pending) {
      const r = this.execute(s, cmd)
      results.push(r)
      s = r.state
    }
    return { results, state: s }
  }

  /** Execute one command against the current state with undo bookkeeping. */
  execute(state: GameState, cmd: PlayerCommand): CommandResult {
    // D10: End Turn commits the turn — the history clears at the boundary
    // and end turn itself is not undoable. Enemy-phase steps never enter
    // this stack (they are applied outside the session).
    if (cmd.kind === "endTurn") {
      this.commitTurn()
      return executeCommand(state, cmd)
    }
    // snapshot the pre-action state for undo
    this.past.push(state)
    // a new action after undo discards the redo tail (AC-10)
    this.future = []
    return executeCommand(state, cmd)
  }

  /** Restore the previous player-phase state (snapshot pop). */
  undo(current: GameState): GameState | undefined {
    const prev = this.past.pop()
    if (!prev) return undefined
    this.future.push(current)
    return prev
  }

  /** Re-apply a state that was undone (snapshot from the redo tail). */
  redo(current: GameState): GameState | undefined {
    const next = this.future.pop()
    if (!next) return undefined
    this.past.push(current)
    return next
  }

  /**
   * End Turn commits (D10): the history clears at the turn boundary.
   * Enemy-phase steps are executed as commands but never enter this stack.
   */
  commitTurn(): void {
    this.past = []
    this.future = []
  }
}
