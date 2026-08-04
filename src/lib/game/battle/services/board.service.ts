import { COLS, ROWS } from "../constants"
import type { GameState, Pos } from "../models"
import { posKey } from "../../shared"
import type { Unit } from "../../units"

export function unitAt(state: GameState, p: Pos): Unit | undefined {
  return state.units.find((u) => u.hp > 0 && u.pos.x === p.x && u.pos.y === p.y)
}

function occupied(state: GameState): Set<string> {
  const s = new Set<string>()
  for (const u of state.units) if (u.hp > 0) s.add(posKey(u.pos))
  return s
}

export const inBounds = (p: Pos) => p.x >= 0 && p.x < COLS && p.y >= 0 && p.y < ROWS
export const manhattan = (a: Pos, b: Pos) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y)

/** Orthogonal BFS reachable tiles for a unit, blocked by occupancy. */
export function reachableTiles(state: GameState, unitId: string): Pos[] {
  const u = state.units.find((x) => x.id === unitId)
  if (!u || u.hp <= 0) return []
  const blocked = occupied(state)
  const start = u.pos
  const seen = new Map<string, number>([[posKey(start), 0]])
  const queue: Pos[] = [start]
  const out: Pos[] = []
  while (queue.length) {
    const cur = queue.shift()!
    const dist = seen.get(posKey(cur))!
    if (dist >= u.move) continue
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const np = { x: cur.x + dx, y: cur.y + dy }
      if (!inBounds(np)) continue
      const k = posKey(np)
      if (seen.has(k)) continue
      if (blocked.has(k)) continue
      seen.set(k, dist + 1)
      out.push(np)
      queue.push(np)
    }
  }
  return out
}
