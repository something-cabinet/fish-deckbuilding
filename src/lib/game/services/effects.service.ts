import type { CardDef, CardEffect } from "../cards"
import type { FxEvent, GameState, LogEntry, Pos } from "../battle"
import type { Unit } from "../units"
import { GOON_DEF } from "../data"
import { cellLabel, heroUnit, nid } from "./engine.service"

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
  targetUnit?: Unit
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

function log(state: GameState, text: string, tone: LogEntry["tone"] = "neutral"): void {
  state.log = [...state.log, { id: state.logCounter++, turn: state.turn, text, tone }].slice(-40)
}

function interpolate(template: string, targetName?: string, tile?: Pos): string {
  let out = template
  if (targetName) out = out.replaceAll("{target}", targetName)
  if (tile) out = out.replaceAll("{tile}", cellLabel(tile))
  return out
}

export function resolveCardEffects(
  state: GameState,
  card: CardDef,
  ctx: { targetUnit?: Unit; tile?: Pos; from?: Pos },
  fx: FxEvent[],
): void {
  const { targetUnit, tile, from } = ctx

  // enemy-target cards fire their card fx once, before effects (D6)
  if (card.target === "enemy" && targetUnit) {
    fx.push({ id: state.logCounter, kind: card.fx, from, to: { ...targetUnit.pos } })
  }

  for (const effect of card.effects) {
    applyEffect(state, card, effect, { targetUnit, tile, from }, fx)
  }

  log(state, interpolate(card.log, targetUnit?.name, tile), card.logTone)
}

function applyEffect(
  state: GameState,
  card: CardDef,
  effect: CardEffect,
  ctx: { targetUnit?: Unit; tile?: Pos; from?: Pos },
  fx: FxEvent[],
): void {
  const { targetUnit, tile, from } = ctx

  switch (effect.kind) {
    case "damage": {
      if (!targetUnit) return
      dealDamage(state, targetUnit, effect.amount, fx)
      break
    }
    case "heal": {
      const healed = effect.target === "caster" ? heroUnit(state) : targetUnit
      if (!healed) break
      healed.hp = Math.min(healed.maxHp, healed.hp + effect.amount)
      fx.push({
        id: state.logCounter,
        kind: "heal",
        to: { ...healed.pos },
        amount: effect.amount,
      })
      break
    }
    case "drawCards": {
      if (from) fx.push({ id: state.logCounter, kind: "draw", to: from })
      drawCards(state, effect.amount, fx)
      break
    }
    case "gainCoin": {
      state.coin += effect.amount
      if (from) fx.push({ id: state.logCounter, kind: "coin", to: from, amount: effect.amount })
      break
    }
    case "buffAtk": {
      if (targetUnit) targetUnit.buffAtk += effect.amount
      break
    }
    case "summon": {
      if (!tile) break
      const goon: Unit = {
        id: nid("goon"),
        name: GOON_DEF.name,
        kind: "goon",
        team: "player",
        pos: { ...tile },
        hp: GOON_DEF.hp,
        maxHp: GOON_DEF.hp,
        atk: GOON_DEF.atk,
        move: GOON_DEF.move,
        range: 1,
        hasMoved: true,
        hasActed: true,
        buffAtk: 0,
      }
      state.units = [...state.units, goon]
      fx.push({ id: state.logCounter, kind: "summon", to: { ...tile } })
      break
    }
    case "custom": {
      const handler = customHandlers.get(effect.handlerId)
      if (!handler) {
        throw new Error(
          `Unknown custom effect handler "${effect.handlerId}" on card "${card.id}" (FR-14)`,
        )
      }
      handler({ state, card, targetUnit, tile, fx })
      break
    }
  }
}

/* ------------------------------------------------------------------ */
/* shared resolution helpers (mirror engine internals)                 */
/* ------------------------------------------------------------------ */

function dealDamage(state: GameState, target: Unit, amount: number, fx: FxEvent[]) {
  target.hp = Math.max(0, target.hp - amount)
  fx.push({ id: state.logCounter, kind: "shock", to: { ...target.pos }, amount })
  if (target.hp <= 0) {
    fx.push({ id: state.logCounter, kind: "death", to: { ...target.pos } })
    log(state, `${target.name} at ${cellLabel(target.pos)} is wiped off the ledger.`, "good")
  }
}

function drawCards(state: GameState, n: number, fx: FxEvent[]) {
  for (let i = 0; i < n; i++) {
    if (state.hand.length >= 8) {
      log(state, "Your hand is full — a card is burned.", "bad")
      continue
    }
    if (state.deck.length === 0) {
      if (state.discard.length === 0) return
      state.deck = shuffle(state.discard)
      state.discard = []
      log(state, "The ledger is reshuffled.", "neutral")
    }
    const card = state.deck.shift()
    if (card) state.hand = [...state.hand, card]
  }
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}
