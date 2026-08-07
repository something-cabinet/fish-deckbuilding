import { EnemyStepKind } from "../enums"
import type { AiCandidate, EnemyStep, GameState, Pos } from "../models"
import { posKey } from "../../shared"
import { AiScorer, Team, resolveAiWeights, unitBounty, type Unit } from "../../units"
import { inBounds, manhattan } from "./board.service"

/** Orthogonal steps, in a fixed order so enumeration — and ties — stay deterministic. */
const DIRECTIONS: readonly (readonly [number, number])[] = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
]

const HERO_ID = "hero"

/** A tile the unit can stand on this turn, plus how it gets there. */
interface ReachableTile {
  pos: Pos
  path: Pos[]
}

/**
 * Every tile a unit can end its move on, including the one it starts on,
 * paired with the walked path. Blocked tiles come from `blocked`, which the
 * planner keeps in sync with its simulation rather than reading live state.
 */
function reachableWithPaths(
  unit: Unit,
  blocked: Set<string>,
  cols: number,
  rows: number,
): ReachableTile[] {
  const startKey = posKey(unit.pos)
  const out: ReachableTile[] = [{ pos: { ...unit.pos }, path: [] }]
  const seen = new Set<string>([startKey])
  let frontier: ReachableTile[] = [{ pos: { ...unit.pos }, path: [] }]

  for (let depth = 0; depth < unit.move; depth++) {
    const next: ReachableTile[] = []
    for (const cur of frontier) {
      for (const [dx, dy] of DIRECTIONS) {
        const np = { x: cur.pos.x + dx, y: cur.pos.y + dy }
        const k = posKey(np)
        if (!inBounds(np, cols, rows)) continue
        if (seen.has(k) || blocked.has(k)) continue
        seen.add(k)
        const tile = { pos: np, path: [...cur.path, np] }
        out.push(tile)
        next.push(tile)
      }
    }
    frontier = next
  }
  return out
}

/**
 * Damage the player could bring onto `dest` next turn — a unit threatens a
 * tile when it could move and still reach it. Deliberately coarse: this is a
 * heuristic for scoring, not a simulation.
 */
function threatAt(dest: Pos, foes: Unit[]): number {
  let total = 0
  for (const f of foes) {
    const reach = f.move + Math.max(1, f.range)
    if (manhattan(dest, f.pos) <= reach) total += Math.max(0, f.atk + f.buffAtk)
  }
  return total
}

interface ScoreContext {
  unit: Unit
  dest: Pos
  target?: Unit
  damage: number
  foes: Unit[]
  allies: Unit[]
}

/**
 * Raw value for one axis. Every branch returns a number where higher is better
 * for the enemy — the weight vector supplies direction and magnitude, never
 * this function.
 */
function rawScore(scorer: AiScorer, ctx: ScoreContext): number {
  switch (scorer) {
    case AiScorer.DamageDealt:
      return ctx.damage

    case AiScorer.KillSecured:
      return ctx.target && ctx.damage >= ctx.target.hp ? 1 : 0

    case AiScorer.LethalOnHero:
      return ctx.target?.id === HERO_ID && ctx.damage >= ctx.target.hp ? 1 : 0

    case AiScorer.SelfPreservation:
      return -threatAt(ctx.dest, ctx.foes)

    case AiScorer.DistanceToTarget: {
      let nearest = Infinity
      for (const f of ctx.foes) nearest = Math.min(nearest, manhattan(ctx.dest, f.pos))
      return nearest === Infinity ? 0 : -nearest
    }

    case AiScorer.AllyClustering:
      return ctx.allies.filter((a) => a.id !== ctx.unit.id && manhattan(ctx.dest, a.pos) === 1)
        .length

    default: {
      const _exhaustive: never = scorer
      return 0
    }
  }
}

/**
 * Score every legal action for one unit against the live board, best first.
 *
 * Exported for tests and for decision introspection — utility AI's failure
 * mode is "why did it do *that*", and the answer is always in this list.
 */
export function rankCandidates(state: GameState, unitId: string): AiCandidate[] {
  const unit = state.units.find((u) => u.id === unitId)
  if (!unit || unit.hp <= 0) return []
  const living = state.units.filter((u) => u.hp > 0)
  const blocked = new Set(living.map((u) => posKey(u.pos)))
  blocked.delete(posKey(unit.pos))
  return rankAgainst(unit, living, blocked, state.cols, state.rows)
}

function rankAgainst(
  unit: Unit,
  living: Unit[],
  blocked: Set<string>,
  cols: number,
  rows: number,
): AiCandidate[] {
  const foes = living.filter((u) => u.team !== unit.team)
  const allies = living.filter((u) => u.team === unit.team)
  const weights = resolveAiWeights(unit.aiProfile)
  const damage = Math.max(0, unit.atk + unit.buffAtk)
  const range = Math.max(1, unit.range)
  const candidates: AiCandidate[] = []

  for (const tile of reachableWithPaths(unit, blocked, cols, rows)) {
    // standing still is always an option, so a unit with nothing worth doing
    // has somewhere to land rather than being forced into a bad attack
    const targets = foes.filter((f) => manhattan(tile.pos, f.pos) <= range)
    for (const option of [undefined, ...targets]) {
      const ctx: ScoreContext = {
        unit,
        dest: tile.pos,
        target: option,
        damage: option ? damage : 0,
        foes,
        allies,
      }
      const scores = {} as Record<AiScorer, number>
      let total = 0
      for (const scorer of Object.values(AiScorer)) {
        const value = rawScore(scorer, ctx)
        scores[scorer] = value
        total += value * (weights[scorer] ?? 0)
      }
      candidates.push({
        unitId: unit.id,
        dest: { ...tile.pos },
        path: tile.path.map((p) => ({ ...p })),
        targetId: option?.id,
        damage: ctx.damage,
        scores,
        total,
      })
    }
  }

  // stable sort keeps enumeration order as the tiebreak, which is what makes
  // the plan reproducible without carrying an RNG seed (NFR-2)
  return candidates.sort((a, b) => b.total - a.total)
}

/** Flatten a chosen candidate into the animatable step list the phase replays. */
function candidateToSteps(candidate: AiCandidate, from: Pos, targetPos?: Pos): EnemyStep[] {
  const steps: EnemyStep[] = []
  let cursor = from
  for (const next of candidate.path) {
    steps.push({
      kind: EnemyStepKind.Move,
      unitId: candidate.unitId,
      from: { ...cursor },
      to: { ...next },
    })
    cursor = next
  }
  if (candidate.targetId && targetPos) {
    steps.push({
      kind: EnemyStepKind.Attack,
      unitId: candidate.unitId,
      targetId: candidate.targetId,
      amount: candidate.damage,
      to: { ...targetPos },
    })
  }
  return steps
}

/**
 * Deterministically plan the whole enemy turn against a simulated board.
 *
 * Units act in descending bounty order (spec D13), and each picks its
 * highest-scoring candidate. The simulation absorbs the result (position,
 * damage, occupancy) before the next unit plans — so allies do not walk into
 * each other or pile damage onto a corpse.
 */
export function planEnemyTurn(state: GameState): EnemyStep[] {
  const steps: EnemyStep[] = []
  const sim = state.units.map((u) => ({ ...u, pos: { ...u.pos } }))
  // stable sort, so equal-bounty units keep board order and stay reproducible
  const enemies = sim
    .filter((u) => u.team === Team.Enemy)
    .sort((a, b) => unitBounty(b) - unitBounty(a))

  for (const unit of enemies) {
    if (unit.hp <= 0) continue
    const living = sim.filter((u) => u.hp > 0)
    if (!living.some((u) => u.team === Team.Player)) break

    const blocked = new Set(living.map((u) => posKey(u.pos)))
    blocked.delete(posKey(unit.pos))
    const best = rankAgainst(unit, living, blocked, state.cols, state.rows)[0]
    if (!best) continue

    const target = best.targetId ? sim.find((u) => u.id === best.targetId) : undefined
    steps.push(...candidateToSteps(best, unit.pos, target?.pos))

    unit.pos = { ...best.dest }
    if (target) target.hp = Math.max(0, target.hp - best.damage)
  }
  return steps
}
