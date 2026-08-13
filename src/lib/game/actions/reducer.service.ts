import type { FxEvent, GameState } from "../battle/models"
import { startEnemyPhase } from "../battle/services"
import { castCard, moveUnit, sellCard, unitAttack } from "./actions.service"
import type { PlayerAction } from "./models"

/**
 * The single pure reducer (D1/D5): every state transition goes through
 * `reduce(state, action) → { state, fx }`. Same `(state, action)` sequence
 * replayed against fresh clones yields identical final states (AC-6).
 *
 * History is NOT handled here — see history.service (D2).
 */
export function reduce(
  state: GameState,
  action: PlayerAction,
): { state: GameState; fx: FxEvent[] } {
  switch (action.kind) {
    case "move":
      return moveUnit(state, action.unitId, action.dest)
    case "attack":
      return unitAttack(state, action.attackerId, action.targetId)
    case "playCard":
      return castCard(state, action.cardUid, action.target)
    case "sell":
      return sellCard(state, action.cardUid)
    case "endTurn":
      // endTurn transitions to the enemy phase; history commits in the
      // history layer (D10), not here.
      return { state: startEnemyPhase(state), fx: [] }
    default: {
      const _exhaustive: never = action
      return { state, fx: [] }
    }
  }
}
