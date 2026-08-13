import { FxKind } from "../../battle/enums"
import type { FxEvent, GameState } from "../../battle/models"
import { cellLabel, emitFx, log } from "../../shared"
import { Team } from "../enums"
import type { Unit } from "../models"

export function effAtk(u: Unit) {
  return Math.max(0, u.atk + u.buffAtk)
}

export function dealDamage(state: GameState, target: Unit, amount: number, fx: FxEvent[]) {
  target.hp = Math.max(0, target.hp - amount)
  fx.push(emitFx(state, { kind: FxKind.Shock, to: { ...target.pos }, amount }))
  if (target.hp <= 0) {
    fx.push(emitFx(state, { kind: FxKind.Death, to: { ...target.pos } }))
    log(state, `${target.name} at ${cellLabel(target.pos)} is wiped off the ledger.`, "good")
  }
}

/**
 * Remove dead units and award Fin for each slain enemy (spec D10).
 *
 * Returns the number of enemies killed in this cleanup pass so callers in
 * layers permitted to touch trinkets can fire onEnemyKilled triggers once per
 * pass (NFR-4: this units-layer service must not import trinkets/cards).
 */
export function cleanupDead(state: GameState): number {
  // award persistent Fin per enemy defeated (spec D10) before they leave the board
  const killed = state.units.filter((u) => u.team === Team.Enemy && u.hp <= 0).length
  if (killed > 0) state.fin += killed
  // keep dead units out of occupancy but remove from array
  state.units = state.units.filter((u) => u.hp > 0)
  return killed
}
