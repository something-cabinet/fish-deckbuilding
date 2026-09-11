import { EnemyStepKind } from "../enums"
import type { AiCandidate, EnemyStep, GameState, Pos } from "../models"
import { posKey } from "../../shared"
import { AiScorer, Team, resolveAiWeights, unitBounty, type Unit } from "../../units"
import { inBounds, manhattan } from "./board.service"
import { CARD_LIBRARY, CardTarget } from "../../cards"

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
        kind: "attack",
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
 *
 * Enemies with cards in hand (drawn from their authored deck) may cast one
 * per turn as their action instead of a basic attack. Card candidates are
 * evaluated alongside move+attack and compared using the same scorer weights.
 */
export function planEnemyTurn(state: GameState): EnemyStep[] {
  const steps: EnemyStep[] = []
  const sim = state.units.map((u) => ({ ...u, pos: { ...u.pos } }))
  const enemies = sim
    .filter((u) => u.team === Team.Enemy)
    .sort((a, b) => unitBounty(b) - unitBounty(a))

  for (const unit of enemies) {
    if (unit.hp <= 0) continue
    const living = sim.filter((u) => u.hp > 0)
    if (!living.some((u) => u.team === Team.Player)) break

    const blocked = new Set(living.map((u) => posKey(u.pos)))
    blocked.delete(posKey(unit.pos))
    const moveCandidates = rankAgainst(unit, living, blocked, state.cols, state.rows)
    const cardCandidates = cardCastCandidates(unit, living, blocked, state.cols, state.rows, state.enemyHands)
    const allCandidates = [...moveCandidates, ...cardCandidates]
    if (allCandidates.length === 0) continue
    allCandidates.sort((a, b) => b.total - a.total)
    const best = allCandidates[0]

    const target = best.targetId ? sim.find((u) => u.id === best.targetId) : undefined
    if (best.kind === "card") {
      steps.push({
        kind: EnemyStepKind.CastCard,
        unitId: unit.id,
        cardId: best.cardId,
        targetId: best.targetId,
      })
    } else {
      steps.push(...candidateToSteps(best, unit.pos, target?.pos))
    }

    unit.pos = { ...best.dest }
    if (target && best.damage > 0) target.hp = Math.max(0, target.hp - best.damage)
  }
  return steps
}

/** Score a card-cast option for an enemy unit at a given destination tile. */
function scoreCardCast(
  unit: Unit,
  cardId: string,
  dest: Pos,
  living: Unit[],
  weights: Record<string, number>,
): { total: number; targetId?: string; damage: number } {
  const def = CARD_LIBRARY[cardId]
  if (!def) return { total: -9999, damage: 0 }

  const foes = living.filter((u) => u.team !== unit.team)
  const allies = living.filter((u) => u.team === unit.team && u.id !== unit.id)

  let targetId: string | undefined
  let damage = 0

  if (def.target === CardTarget.Enemy) {
    for (const eff of def.effects) {
      if (eff.kind === "damage") damage += eff.amount
    }
    const inRange = foes.filter((f) => manhattan(dest, f.pos) <= def.range)
    if (inRange.length === 0) return { total: -9999, damage: 0 }
    const nearest = inRange.sort((a, b) => manhattan(a.pos, dest) - manhattan(b.pos, dest))[0]
    targetId = nearest?.id
  } else if (def.target === CardTarget.Ally || def.target === CardTarget.Unit) {
    const inRange = allies.filter((a) => manhattan(dest, a.pos) <= def.range)
    if (inRange.length === 0) return { total: -9999, damage: 0 }
    const worst = inRange.sort((a, b) => a.hp - b.hp)[0]
    targetId = worst?.id
  }

  const ctx: ScoreContext = { unit, dest, target: living.find((u) => u.id === targetId), damage, foes, allies }
  let total = 0
  for (const scorer of Object.values(AiScorer)) {
    total += rawScore(scorer, ctx) * (weights[scorer] ?? 0)
  }
  return { total, targetId, damage }
}

/** Generate candidates for casting each card in the enemy's hand. */
function cardCastCandidates(
  unit: Unit,
  living: Unit[],
  blocked: Set<string>,
  cols: number,
  rows: number,
  enemyHands: Record<string, string[]>,
): AiCandidate[] {
  const out: AiCandidate[] = []
  const hand = enemyHands[unit.id]
  if (!hand || hand.length === 0) return out

  const weights = resolveAiWeights(unit.aiProfile)

  for (const tile of reachableWithPaths(unit, blocked, cols, rows)) {
    for (const cardId of hand) {
      const scored = scoreCardCast(unit, cardId, tile.pos, living, weights)
      if (scored.total === -9999) continue
      out.push({
        unitId: unit.id,
        dest: { ...tile.pos },
        path: tile.path.map((p) => ({ ...p })),
        targetId: scored.targetId,
        damage: scored.damage,
        scores: {} as Record<AiScorer, number>,
        total: scored.total,
        kind: "card",
        cardId,
      })
    }
  }
  return out
}
