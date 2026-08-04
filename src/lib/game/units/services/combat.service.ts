import { FxKind } from "../../battle/enums"
import type { FxEvent, GameState } from "../../battle/models"
import { cellLabel, log } from "../../shared"
import type { Unit } from "../models"

export function effAtk(u: Unit) {
  return Math.max(0, u.atk + u.buffAtk)
}

export function dealDamage(state: GameState, target: Unit, amount: number, fx: FxEvent[]) {
  target.hp = Math.max(0, target.hp - amount)
  fx.push({ id: state.logCounter, kind: FxKind.Shock, to: { ...target.pos }, amount })
  if (target.hp <= 0) {
    fx.push({ id: state.logCounter, kind: FxKind.Death, to: { ...target.pos } })
    log(state, `${target.name} at ${cellLabel(target.pos)} is wiped off the ledger.`, "good")
  }
}

export function cleanupDead(state: GameState) {
  // keep dead units out of occupancy but remove from array
  state.units = state.units.filter((u) => u.hp > 0)
}
