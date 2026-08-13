import type { FxEvent, GameState } from "../battle/models"
import { reduce } from "./reducer.service"
import type { PlayerAction } from "./models"

/**
 * Undo/redo history as pure functions over a `{ state, past, future }` bundle
 * (D2). No mutable session object, no refs — the hook holds the whole bundle
 * in one useState and dispatches pure updaters.
 *
 * Semantics are identical to the former snapshot-based session layer:
 * - every non-endTurn action pushes the pre-action snapshot onto `past`
 * - a new action after undo discards the redo tail
 * - endTurn commits (clears history) and is not itself undoable
 * - enemy-phase steps never enter the bundle (they are applied outside it)
 */
export interface HistoryBundle {
  state: GameState
  past: GameState[]
  future: GameState[]
}

/** A history transition: the new bundle plus the fx produced by the action. */
export interface HistoryResult extends HistoryBundle {
  fx: FxEvent[]
}

/** Apply a player action with undo/redo bookkeeping (pure). */
export function historyReducer(bundle: HistoryBundle, action: PlayerAction): HistoryResult {
  if (action.kind === "endTurn") {
    const { state } = reduce(bundle.state, action)
    return { state, past: [], future: [], fx: [] }
  }
  const { state, fx } = reduce(bundle.state, action)
  return { state, past: [...bundle.past, bundle.state], future: [], fx }
}

/** Pop exactly one pre-action snapshot (pure). No-op when history is empty. */
export function undoHistory(bundle: HistoryBundle): HistoryBundle {
  const prev = bundle.past[bundle.past.length - 1]
  if (!prev) return bundle
  return { state: prev, past: bundle.past.slice(0, -1), future: [...bundle.future, bundle.state] }
}

/** Re-apply the most recently undone action (pure). No-op when redo is empty. */
export function redoHistory(bundle: HistoryBundle): HistoryBundle {
  const next = bundle.future[bundle.future.length - 1]
  if (!next) return bundle
  return { state: next, past: [...bundle.past, bundle.state], future: bundle.future.slice(0, -1) }
}
