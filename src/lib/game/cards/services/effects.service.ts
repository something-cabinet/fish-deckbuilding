import { CardTarget } from "../enums"
import type { CardDef, CardEffect } from "../models"
import { FxKind } from "../../battle/enums"
import type { FxEvent, GameState, Pos } from "../../battle/models"
import { Team, UnitKind, type Unit } from "../../units"
import { dealDamage } from "../../units"
import { resolveSummon } from "../../summons"
import { drawCards } from "../../deck"
import { cellLabel, emitFx, heroUnit, log, nid } from "../../shared"

/* ------------------------------------------------------------------ */
/* Custom-effect registry (D11 escape hatch)                           */
/*                                                                     */
/* Long-tail cards that no effect primitive can express register a     */
/* handler by id. Zero handlers ship in the initial migration (YAGNI); */
/* the FIRST card that needs unique behavior adds the first one.       */
/* ------------------------------------------------------------------ */

export interface CustomEffectContext {
  state: GameState
  card: CardDef
  targetUnits: Unit[]
  tile?: Pos
  fx: FxEvent[]
}

export type CustomEffectHandler = (ctx: CustomEffectContext) => void

const customHandlers = new Map<string, CustomEffectHandler>()

export function registerCustomEffectHandler(
  handlerId: string,
  handler: CustomEffectHandler,
): void {
  customHandlers.set(handlerId, handler)
}

export function hasCustomEffectHandler(handlerId: string): boolean {
  return customHandlers.has(handlerId)
}

/* ------------------------------------------------------------------ */
/* Resolver — exhaustive match over the CardEffect union (D5)          */
/*                                                                     */
/* Applies each effect in order, mutating the (already-cloned) state,  */
/* pushing FxEvent[]s and log entries exactly as the former castCard   */
/* switch did. Behavior must be byte-identical (D4).                   */
/*                                                                     */
/* FX rule (mirrors the switch): enemy-target cards emit their card    */
/* fx separately first (from=hero, to=target); ally/self/empty-tile    */
/* cards merge the visual into the effect's own fx emission.           */
/* ------------------------------------------------------------------ */

function interpolate(template: string, targetNames: string[], tile?: Pos): string {
  let out = template
  if (targetNames.length) out = out.replaceAll("{target}", targetNames.join(", "))
  if (tile) out = out.replaceAll("{tile}", cellLabel(tile))
  return out
}

/** Resolve card effects against state, mutating the (already-cloned) state,
 * pushing FxEvent[]s and log entries. Accepts an optional `casterTeam` for
 * enemy-cast cards (defaults to Player). */
export function resolveCardEffects(
  state: GameState,
  card: CardDef,
  ctx: { targetUnits?: Unit[]; tile?: Pos; from?: Pos; casterTeam?: Team },
  fx: FxEvent[],
): void {
  const { tile, from } = ctx
  const targetUnits = ctx.targetUnits ?? []
  const casterTeam = ctx.casterTeam ?? Team.Player

  // enemy-target cards fire their card fx once, before effects (D6); a blast
  // lands on its aimed tile, a single-target card on the unit it picked
  const impact = tile ?? targetUnits[0]?.pos
  if (card.target === CardTarget.Enemy && impact) {
    fx.push(emitFx(state, { kind: card.fx, from, to: { ...impact } }))
  }

  for (const effect of card.effects) {
    applyEffect(state, card, effect, { targetUnits, tile, from, casterTeam }, fx)
  }

  log(state, interpolate(card.log, targetUnits.map((u) => u.name), tile), card.logTone)
}

function casterOrEmpty(state: GameState): Unit[] {
  const hero = heroUnit(state)
  return hero ? [hero] : []
}

function applyEffect(
  state: GameState,
  card: CardDef,
  effect: CardEffect,
  ctx: { targetUnits: Unit[]; tile?: Pos; from?: Pos; casterTeam?: Team },
  fx: FxEvent[],
): void {
  const { targetUnits, tile, from, casterTeam = Team.Player } = ctx

  switch (effect.kind) {
    case "damage": {
      for (const target of targetUnits) dealDamage(state, target, effect.amount, fx)
      break
    }
    case "heal": {
      const healed = effect.target === "caster" ? casterOrEmpty(state) : targetUnits
      for (const unit of healed) {
        unit.hp = Math.min(unit.maxHp, unit.hp + effect.amount)
        fx.push(
          emitFx(state, {
            kind: FxKind.Heal,
            to: { ...unit.pos },
            amount: effect.amount,
          }),
        )
      }
      break
    }
    case "drawCards": {
      if (from) fx.push(emitFx(state, { kind: FxKind.Draw, to: from }))
      drawCards(state, effect.amount, fx)
      break
    }
    case "gainCoin": {
      state.coin += effect.amount
      if (from) fx.push(emitFx(state, { kind: FxKind.Coin, to: from, amount: effect.amount }))
      break
    }
    case "buffAtk": {
      for (const target of targetUnits) target.buffAtk += effect.amount
      break
    }
    case "summon": {
      if (!tile) break
      const summonDef = resolveSummon(effect.unit)
      const summoned: Unit = {
        id: nid(summonDef.id),
        name: summonDef.name,
        kind: UnitKind.Goon,
        team: casterTeam,
        pos: { ...tile },
        hp: summonDef.hp,
        maxHp: summonDef.hp,
        atk: summonDef.atk,
        move: summonDef.move,
        range: summonDef.range,
        icon: summonDef.icon,
        hasMoved: true,
        hasActed: true,
        buffAtk: 0,
      }
      state.units = [...state.units, summoned]
      fx.push(emitFx(state, { kind: FxKind.Summon, to: { ...tile } }))
      break
    }
    case "custom": {
      const handler = customHandlers.get(effect.handlerId)
      if (!handler) {
        throw new Error(
          `Unknown custom effect handler "${effect.handlerId}" on card "${card.id}" (FR-14)`,
        )
      }
      handler({ state, card, targetUnits, tile, fx })
      break
    }
  }
}
