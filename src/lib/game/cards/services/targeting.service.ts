import { Phase } from "../../battle/enums"
import type { GameState, Pos } from "../../battle/models"
import { Team } from "../../units"
import { posKey } from "../../shared"
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

/** Which unit ids (or tiles) a card may target. */
export function cardTargets(state: GameState, card: CardInstance): {
  unitIds: string[]
  tiles: Pos[]
} {
  const t = card.def.target
  switch (t) {
    case CardTarget.Enemy:
      return {
        unitIds: state.units.filter((u) => u.team === Team.Enemy && u.hp > 0).map((u) => u.id),
        tiles: [],
      }
    case CardTarget.Ally:
      return {
        unitIds: state.units.filter((u) => u.team === Team.Player && u.hp > 0).map((u) => u.id),
        tiles: [],
      }
    case CardTarget.Unit:
      return { unitIds: state.units.filter((u) => u.hp > 0).map((u) => u.id), tiles: [] }
    case CardTarget.EmptyTile:
      return { unitIds: [], tiles: emptyTiles(state) }
    case CardTarget.Self:
      return { unitIds: [], tiles: [] }
    default: {
      const _exhaustive: never = t
      return { unitIds: [], tiles: [] }
    }
  }
}
