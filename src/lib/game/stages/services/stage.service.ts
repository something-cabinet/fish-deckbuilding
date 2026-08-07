import type { EnemyDef } from "../../units/models"
import type { EnemySpawn } from "../../units/data/enemy-spawn.interface"
import type { ZoneId } from "../../overworld-types"
import type { StageDef, StageType } from "../models/stage-def.interface"

/**
 * Multiplier applied to a *normal* stage standing in for a missing elite one.
 * Authored elite stages are used as-is — their difficulty is the author's call.
 */
export const ELITE_SCALE = 1.6

/** Stages available to a zone for a given kind of node. */
export function stagesFor(stages: StageDef[], zone: ZoneId, type: StageType): StageDef[] {
  return stages.filter((s) => s.zone === zone && s.type === type)
}

/**
 * Pick one stage from the matching pool. The choice is a pure function of the
 * seed, so re-entering the same node fights the same stage rather than
 * rerolling on every render.
 */
export function pickStage(
  stages: StageDef[],
  zone: ZoneId,
  type: StageType,
  seed: number,
): StageDef | null {
  const pool = stagesFor(stages, zone, type)
  if (pool.length === 0) return null
  const idx = Math.abs(Math.trunc(seed)) % pool.length
  return pool[idx]
}

/**
 * Resolve a stage's placements into battle spawns. Placements reference enemy
 * templates by id, so editing a template changes every stage that uses it.
 * Unknown ids and out-of-bounds placements are dropped rather than throwing —
 * a stage that outlived a deleted enemy still starts a battle.
 */
export function stageToSpawns(
  stage: StageDef,
  enemies: EnemyDef[],
  opts: { elite?: boolean } = {},
): EnemySpawn[] {
  const byId = new Map(enemies.map((e) => [e.id, e]))
  const scale = opts.elite ? ELITE_SCALE : 1

  const out: EnemySpawn[] = []
  for (const p of stage.placements) {
    const def = byId.get(p.enemyId)
    if (!def) continue
    if (p.x < 0 || p.x >= stage.cols || p.y < 0 || p.y >= stage.rows) continue
    out.push({
      name: opts.elite ? `Elite ${def.name}` : def.name,
      kind: def.kind,
      x: p.x,
      y: p.y,
      hp: Math.round(def.hp * scale),
      atk: Math.round(def.atk * scale),
      move: def.move,
      range: def.range,
      aiProfile: def.aiProfile,
    })
  }
  return out
}
