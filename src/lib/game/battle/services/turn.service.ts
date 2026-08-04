import { EnemyStepKind, FxKind, Phase } from "../enums"
import type { FxEvent, GameState, Pos } from "../models"
import { cellLabel, clone, heroUnit, log, posKey } from "../../shared"
import { Team } from "../../units"
import { cleanupDead, dealDamage } from "../../units"
import { drawCards } from "../../deck"
import { inBounds, manhattan } from "./board.service"

export interface EnemyStep {
  kind: EnemyStepKind
  unitId: string
  from?: Pos
  to?: Pos
  targetId?: string
  amount?: number
}

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

/** Deterministically plan the enemy turn against a simulated board. */
export function planEnemyTurn(state: GameState): EnemyStep[] {
  const steps: EnemyStep[] = []
  // simulate positions / hp locally
  const sim = state.units.map((u) => ({ ...u, pos: { ...u.pos } }))
  const alive = () => sim.filter((u) => u.hp > 0)
  const blockedSet = () => new Set(alive().map((u) => posKey(u.pos)))

  const players = () => alive().filter((u) => u.team === Team.Player)
  const enemies = sim.filter((u) => u.team === Team.Enemy)

  for (const e of enemies) {
    if (e.hp <= 0) continue
    const targets = players()
    if (targets.length === 0) break
    // nearest player
    let target = targets[0]
    let best = manhattan(e.pos, target.pos)
    for (const t of targets) {
      const d = manhattan(e.pos, t.pos)
      if (d < best) {
        best = d
        target = t
      }
    }

    // move greedily toward target (up to move range), not onto occupied tiles
    let steps_left = e.move
    while (steps_left > 0 && manhattan(e.pos, target.pos) > 1) {
      const blocked = blockedSet()
      blocked.delete(posKey(e.pos))
      const options: Pos[] = []
      for (const [dx, dy] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ]) {
        const np = { x: e.pos.x + dx, y: e.pos.y + dy }
        if (!inBounds(np)) continue
        if (blocked.has(posKey(np))) continue
        options.push(np)
      }
      if (options.length === 0) break
      options.sort((a, b) => manhattan(a, target.pos) - manhattan(b, target.pos))
      const next = options[0]
      if (manhattan(next, target.pos) >= manhattan(e.pos, target.pos)) break
      steps.push({ kind: EnemyStepKind.Move, unitId: e.id, from: { ...e.pos }, to: { ...next } })
      e.pos = next
      steps_left--
    }

    // attack if adjacent
    if (manhattan(e.pos, target.pos) <= 1) {
      const dmg = Math.max(0, e.atk + e.buffAtk)
      steps.push({ kind: EnemyStepKind.Attack, unitId: e.id, targetId: target.id, amount: dmg, to: { ...target.pos } })
      target.hp -= dmg
    }
  }
  return steps
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
  s.maxMana = Math.min(10, s.maxMana + 1)
  s.mana = s.maxMana
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
