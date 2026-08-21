import { Phase } from "../../battle/enums"
import type { GameState, Pos } from "../../battle/models"
import { manhattan } from "../../battle/services/board.service"
import { Team } from "../../units"
import { heroUnit, posKey } from "../../shared"
import { CardTarget } from "../enums"
import type { CardInstance } from "../models"

export function canCast(state: GameState, card: CardInstance): boolean {
  return state.phase === Phase.Player && card.def.cost <= state.coin
}

function occupied(state: GameState): Set<string> {
  const s = new Set<string>()
  for (const u of state.units) if (u.hp > 0) s.add(posKey(u.pos))
  return s
}

function emptyTiles(state: GameState): Pos[] {
  const blocked = occupied(state)
  const out: Pos[] = []
  for (let y = 0; y < state.rows; y++)
    for (let x = 0; x < state.cols; x++) {
      const p = { x, y }
      if (!blocked.has(posKey(p))) out.push(p)
    }
  return out
}

/**
 * Cast range: Manhattan distance in orthogonal steps from the caster (hero),
 * so range 1 is melee — the 4 orthogonally adjacent tiles — and each extra
 * step adds one diamond ring (range 2 = 12 tiles). Range never constrains
 * when no hero exists on the board (defensive fallback).
 */
function inRangeOfCaster(state: GameState, range: number): (p: Pos) => boolean {
  const hero = heroUnit(state)
  if (!hero) return () => true
  return (p: Pos) => manhattan(hero.pos, p) <= range
}

/** Which unit ids (or tiles) a card may target. */
export function cardTargets(state: GameState, card: CardInstance): {
  unitIds: string[]
  tiles: Pos[]
} {
  const t = card.def.target
  const inRange = inRangeOfCaster(state, card.def.range)
  switch (t) {
    case CardTarget.Enemy:
      return {
        unitIds: state.units
          .filter((u) => u.team === Team.Enemy && u.hp > 0 && inRange(u.pos))
          .map((u) => u.id),
        tiles: [],
      }
    case CardTarget.Ally:
      return {
        unitIds: state.units
          .filter((u) => u.team === Team.Player && u.hp > 0 && inRange(u.pos))
          .map((u) => u.id),
        tiles: [],
      }
    case CardTarget.Unit:
      return {
        unitIds: state.units.filter((u) => u.hp > 0 && inRange(u.pos)).map((u) => u.id),
        tiles: [],
      }
    case CardTarget.EmptyTile:
      return { unitIds: [], tiles: emptyTiles(state).filter(inRange) }
    case CardTarget.Self:
      return { unitIds: [], tiles: [] }
    default: {
      const _exhaustive: never = t
      return { unitIds: [], tiles: [] }
    }
  }
}
