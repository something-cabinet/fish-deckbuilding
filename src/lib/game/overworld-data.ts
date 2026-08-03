import type { CardDef } from "./types"
import type { ZoneDef } from "./overworld-types"

/**
 * Static zone definitions for the overworld. Map *layout* is generated
 * deterministically from the run seed (see overworld-engine), but the zone
 * identities, boss stats, and enemy pools live here.
 */
export const ZONES: ZoneDef[] = [
  {
    id: "shallows",
    index: 0,
    name: "The Shallows",
    tagline: "Sun-dappled reef. The rent is due.",
    rows: 6,
    minNodes: 2,
    maxNodes: 3,
    boss: { name: "Barnacle Brute", hp: 18, atk: 4, move: 1 },
    enemyPool: [
      { name: "Thug", kind: "thug", hp: 4, atk: 2, move: 2 },
      { name: "Enforcer", kind: "enforcer", hp: 6, atk: 3, move: 2 },
    ],
    theme: "shallow",
  },
  {
    id: "midwaters",
    index: 1,
    name: "The Midwaters",
    tagline: "Twilight current. Interest compounds down here.",
    rows: 6,
    minNodes: 3,
    maxNodes: 3,
    boss: { name: "The Collection Shark", hp: 26, atk: 5, move: 2 },
    enemyPool: [
      { name: "Enforcer", kind: "enforcer", hp: 6, atk: 3, move: 2 },
      { name: "Thug", kind: "thug", hp: 7, atk: 3, move: 2 },
    ],
    theme: "mid",
  },
  {
    id: "depths",
    index: 2,
    name: "The Depths",
    tagline: "The ledger's bottom. The boss of bosses.",
    rows: 7,
    minNodes: 2,
    maxNodes: 3,
    boss: { name: "The Forecloser", hp: 34, atk: 6, move: 2 },
    enemyPool: [
      { name: "Enforcer", kind: "enforcer", hp: 9, atk: 4, move: 2 },
      { name: "Thug", kind: "thug", hp: 10, atk: 4, move: 2 },
    ],
    theme: "deep",
  },
]

export const ZONE_COUNT = ZONES.length

/** How many of each node kind appears per zone map (rows 1..n-2). */
export const NODE_KIND_WEIGHTS = {
  battle: 3,
  rest: 1,
}
