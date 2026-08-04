import { FxKind, Phase } from "../battle/enums"
import type { FxEvent, GameState, Pos } from "../battle/models"
import { clone, heroUnit, log } from "../shared"
import { checkEnd, manhattan, reachableTiles } from "../battle/services"
import { cleanupDead, dealDamage, effAtk } from "../units"
import { Team } from "../units"
import { CardTarget, cardTargets, resolveCardEffects, type CardInstance } from "../cards"

export function moveUnit(
  state: GameState,
  unitId: string,
  dest: Pos,
): { state: GameState; fx: FxEvent[] } {
  const s = clone(state)
  const fx: FxEvent[] = []
  const u = s.units.find((x) => x.id === unitId)
  if (!u || u.team !== Team.Player || u.hasMoved) return { state, fx }
  const reachable = reachableTiles(s, unitId)
  if (!reachable.some((p) => p.x === dest.x && p.y === dest.y)) return { state, fx }
  fx.push({ id: s.logCounter, kind: FxKind.Move, from: { ...u.pos }, to: { ...dest } })
  u.pos = { ...dest }
  u.hasMoved = true
  checkEnd(s)
  return { state: s, fx }
}

/** Basic melee/ranged attack by a player unit onto an enemy. */
export function unitAttack(
  state: GameState,
  attackerId: string,
  targetId: string,
): { state: GameState; fx: FxEvent[] } {
  const s = clone(state)
  const fx: FxEvent[] = []
  const a = s.units.find((x) => x.id === attackerId)
  const t = s.units.find((x) => x.id === targetId)
  if (!a || !t || a.team !== Team.Player || t.team !== Team.Enemy || a.hasActed) return { state, fx }
  if (manhattan(a.pos, t.pos) > a.range) return { state, fx }
  fx.push({ id: s.logCounter, kind: FxKind.Melee, from: { ...a.pos }, to: { ...t.pos } })
  dealDamage(s, t, effAtk(a), fx)
  a.hasActed = true
  log(s, `${a.name} strikes ${t.name} for ${effAtk(a)}.`, "good")
  cleanupDead(s)
  checkEnd(s)
  return { state: s, fx }
}

export function castCard(
  state: GameState,
  cardUid: string,
  target: { unitId?: string; tile?: Pos },
): { state: GameState; fx: FxEvent[] } {
  const s = clone(state)
  const fx: FxEvent[] = []
  const idx = s.hand.findIndex((c) => c.uid === cardUid)
  if (idx < 0) return { state, fx }
  const card = s.hand[idx]
  if (card.def.cost > s.coin) return { state, fx }

  const hero = heroUnit(s)
  const from = hero ? { ...hero.pos } : undefined
  const tgtUnit = target.unitId ? s.units.find((u) => u.id === target.unitId) : undefined

  const valid = cardTargets(s, card)
  if (card.def.target !== CardTarget.Self) {
    if (card.def.target === CardTarget.EmptyTile) {
      if (!target.tile || !valid.tiles.some((p) => p.x === target.tile!.x && p.y === target.tile!.y))
        return { state, fx }
    } else if (!tgtUnit || !valid.unitIds.includes(tgtUnit.id)) {
      return { state, fx }
    }
  }

  // pay + move card to discard
  s.coin -= card.def.cost
  s.spentCount += 1
  s.hand = s.hand.filter((c) => c.uid !== cardUid)
  s.discard = [...s.discard, card]

  // delegate effect application to the data-driven resolver (FR-3) — no
  // switch on card id; effects come from the trusted JSON source.
  resolveCardEffects(s, card.def, { targetUnit: tgtUnit, tile: target.tile, from }, fx)

  cleanupDead(s)
  checkEnd(s)
  return { state: s, fx }
}

/**
 * Sell a card from hand for Coin this turn (spec D8: sellValue = max(1, cost),
 * with `value` acting as the authored per-card override). Selling is the
 * primary way to fund the turn's plays.
 */
export function sellCard(state: GameState, cardUid: string): GameState {
  const s = clone(state)
  const idx = s.hand.findIndex((c) => c.uid === cardUid)
  if (idx < 0 || s.phase !== Phase.Player) return state
  const card = s.hand[idx]
  const gain = Math.max(1, card.def.value)
  s.coin += gain
  s.hand = s.hand.filter((c) => c.uid !== cardUid)
  s.discard = [...s.discard, card]
  log(s, `Sold ${card.def.name} on the street for ${gain} coin.`, "gold")
  return s
}
