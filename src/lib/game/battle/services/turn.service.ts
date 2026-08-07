import { EnemyStepKind, FxKind, Phase } from "../enums"
import type { EnemyStep, FxEvent, GameState } from "../models"
import { clone, heroUnit, log } from "../../shared"
import { Team } from "../../units"
import { cleanupDead, dealDamage } from "../../units"
import { drawCards } from "../../deck"
import { COIN_TURN_BASE } from "../../cards"

export function checkEnd(state: GameState) {
  const hero = heroUnit(state)
  const enemiesLeft = state.units.some((u) => u.team === Team.Enemy && u.hp > 0)
  if (!hero || hero.hp <= 0) {
    state.phase = Phase.Lost
    log(state, "Guppy sleeps with the fishes. The mob wins.", "bad")
  } else if (!enemiesLeft) {
    state.phase = Phase.Won
    log(state, "The whole crew is settled. The waters are yours.", "gold")
  } else if (state.foreclosure <= 0) {
    state.phase = Phase.Lost
    log(state, "The Foreclosure clock hit zero. The mob takes everything.", "bad")
  }
}

export function startEnemyPhase(state: GameState): GameState {
  const s = clone(state)
  s.phase = Phase.Enemy
  return s
}

/** Apply a single planned enemy step to real state, producing fx. */
export function applyEnemyStep(
  state: GameState,
  step: EnemyStep,
): { state: GameState; fx: FxEvent[] } {
  const s = clone(state)
  const fx: FxEvent[] = []
  const u = s.units.find((x) => x.id === step.unitId)
  if (!u || u.hp <= 0) return { state: s, fx }
  switch (step.kind) {
    case EnemyStepKind.Move: {
      if (step.to) {
        fx.push({ id: s.logCounter, kind: FxKind.Move, from: { ...u.pos }, to: { ...step.to } })
        u.pos = { ...step.to }
      }
      break
    }
    case EnemyStepKind.Attack: {
      if (step.targetId) {
        const t = s.units.find((x) => x.id === step.targetId)
        if (t && t.hp > 0) {
          fx.push({ id: s.logCounter, kind: FxKind.Melee, from: { ...u.pos }, to: { ...t.pos } })
          dealDamage(s, t, step.amount ?? 0, fx)
          log(s, `${u.name} hits ${t.name} for ${step.amount}.`, "bad")
        }
      }
      break
    }
    default: {
      const _exhaustive: never = step.kind
    }
  }
  cleanupDead(s)
  checkEnd(s)
  return { state: s, fx }
}

/** Finish enemy phase → refresh for the player's next turn. */
export function beginPlayerTurn(state: GameState): GameState {
  const s = clone(state)
  const fx: FxEvent[] = []
  if (s.phase === Phase.Won || s.phase === Phase.Lost) return s

  s.turn += 1
  s.interest += 1
  s.foreclosure = Math.max(0, s.foreclosure - 1)
  // sell-to-play economy: Coin does not ramp or carry over — each turn starts
  // fresh at the base and is fueled by selling cards / income cards (spec D7).
  s.coin = COIN_TURN_BASE
  s.spentCount = 0
  s.phase = Phase.Player

  // refresh player units
  for (const u of s.units) {
    if (u.team === Team.Player) {
      u.hasMoved = false
      u.hasActed = false
    } else {
      u.hasMoved = false
      u.hasActed = false
    }
  }

  drawCards(s, 1, fx)

  // escalation via interest
  if (s.interest > 0 && s.interest % 4 === 0) {
    for (const u of s.units) if (u.team === Team.Enemy) u.buffAtk += 1
    log(s, "Interest compounds — the mob grows stronger (+1 ATK).", "bad")
  }

  checkEnd(s)
  return s
}
