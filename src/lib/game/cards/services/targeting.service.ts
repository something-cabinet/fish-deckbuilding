import { Phase } from "../../battle/enums"
import type { GameState, Pos } from "../../battle/models"
import { inBounds, manhattan } from "../../battle/services/board.service"
import { Team, type Unit } from "../../units"
import { heroUnit, posKey } from "../../shared"
import { AimMode, CardTarget } from "../enums"
import { AOE_SINGLE_TILE } from "../constants"
import type { CardDef, CardInstance } from "../models"

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

/** Every board tile within cast range — the yellow range indicator diamond. */
function rangeTiles(state: GameState, inRange: (p: Pos) => boolean): Pos[] {
  const out: Pos[] = []
  for (let y = 0; y < state.rows; y++)
    for (let x = 0; x < state.cols; x++) {
      const p = { x, y }
      if (inRange(p)) out.push(p)
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

/**
 * How the player aims the card. Cards carrying a blast radius always aim at a
 * tile, so the centre can sit on an empty square between several units — which
 * is the whole point of an area effect.
 */
export function aimMode(def: CardDef): AimMode {
  if (def.target === CardTarget.Self) return AimMode.None
  if (def.target === CardTarget.EmptyTile) return AimMode.Tile
  if (def.aoe > AOE_SINGLE_TILE) return AimMode.Tile
  return AimMode.Unit
}

/** Tiles a Manhattan diamond of `radius` covers on an unbounded board. */
export function aoeTileCount(radius: number): number {
  return 2 * radius * radius + 2 * radius + 1
}

/** The blast diamond around `centre`, clipped to the board. */
export function aoeTiles(state: GameState, centre: Pos, radius: number): Pos[] {
  const out: Pos[] = []
  for (let dy = -radius; dy <= radius; dy++) {
    const span = radius - Math.abs(dy)
    for (let dx = -span; dx <= span; dx++) {
      const p = { x: centre.x + dx, y: centre.y + dy }
      if (inBounds(p, state.cols, state.rows)) out.push(p)
    }
  }
  return out
}

function affectsTeam(target: CardTarget): (u: Unit) => boolean {
  if (target === CardTarget.Enemy) return (u) => u.team === Team.Enemy
  if (target === CardTarget.Ally) return (u) => u.team === Team.Player
  if (target === CardTarget.Unit) return () => true
  return () => false
}

/** Living units the card's effects apply to when its blast is centred on `centre`. */
export function unitsInAoe(state: GameState, def: CardDef, centre: Pos): Unit[] {
  const affects = affectsTeam(def.target)
  return state.units.filter(
    (u) => u.hp > 0 && affects(u) && manhattan(u.pos, centre) <= def.aoe,
  )
}

/** Which unit ids (or tiles) a card may target. */
export function cardTargets(state: GameState, card: CardInstance): {
  unitIds: string[]
  tiles: Pos[]
} {
  const def = card.def
  const inRange = inRangeOfCaster(state, def.range)
  const mode = aimMode(def)

  if (mode === AimMode.None) return { unitIds: [], tiles: [] }

  if (mode === AimMode.Tile) {
    if (def.target === CardTarget.EmptyTile) {
      return { unitIds: [], tiles: emptyTiles(state).filter(inRange) }
    }
    return { unitIds: [], tiles: rangeTiles(state, inRange) }
  }

  const affects = affectsTeam(def.target)
  return {
    unitIds: state.units
      .filter((u) => u.hp > 0 && affects(u) && inRange(u.pos))
      .map((u) => u.id),
    tiles: rangeTiles(state, inRange),
  }
}
