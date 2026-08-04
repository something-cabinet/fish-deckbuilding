import type { NodeType, ZoneDef } from "./overworld-types"
import { UnitKind } from "./units"

/**
 * Static zone definitions for the overworld. Map *layout* is generated
 * deterministically from the run seed (see overworld-engine), but the zone
 * identities, boss stats, enemy pools, and economy tuning live here.
 */
export const ZONES: ZoneDef[] = [
  {
    id: "shallows",
    index: 0,
    name: "The Shallows",
    tagline: "Sun-dappled reef. The rent is due.",
    rows: 6,
    minNodes: 2,
    maxNodes: 4,
    baseRent: 6,
    boss: { name: "Barnacle Brute", hp: 18, atk: 4, move: 1 },
    enemyPool: [
      { name: "Thug", kind: UnitKind.Thug, hp: 4, atk: 2, move: 2 },
      { name: "Enforcer", kind: UnitKind.Enforcer, hp: 6, atk: 3, move: 2 },
    ],
    theme: "shallow",
  },
  {
    id: "midwaters",
    index: 1,
    name: "The Midwaters",
    tagline: "Twilight current. Interest compounds down here.",
    rows: 6,
    minNodes: 2,
    maxNodes: 4,
    baseRent: 10,
    boss: { name: "The Collection Shark", hp: 26, atk: 5, move: 2 },
    enemyPool: [
      { name: "Enforcer", kind: UnitKind.Enforcer, hp: 6, atk: 3, move: 2 },
      { name: "Thug", kind: UnitKind.Thug, hp: 7, atk: 3, move: 2 },
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
    maxNodes: 4,
    baseRent: 16,
    boss: { name: "The Forecloser", hp: 34, atk: 6, move: 2 },
    enemyPool: [
      { name: "Enforcer", kind: UnitKind.Enforcer, hp: 9, atk: 4, move: 2 },
      { name: "Thug", kind: UnitKind.Thug, hp: 10, atk: 4, move: 2 },
    ],
    theme: "deep",
  },
]

export const ZONE_COUNT = ZONES.length

/**
 * Weighted bag for the *filler* node kinds on middle rows. Boss, start,
 * elite, and the guaranteed shop/rest are placed structurally by the
 * generator; these weights decide the remaining middle-row nodes.
 */
export const NODE_KIND_WEIGHTS: Partial<Record<NodeType, number>> = {
  battle: 5,
  event: 3,
  treasure: 2,
  shop: 1,
  rest: 1,
}

/* ------------------------------------------------------------------ */
/* economy / debt ledger tuning                                        */
/* ------------------------------------------------------------------ */

/** Debt the hero starts a run owing — "the rent is due" from turn one. */
export const START_DEBT = 20
/** Compounding rate applied to outstanding debt on every node cleared. */
export const INTEREST_RATE = 0.12
/** Debt at which the syndicate forecloses and the run is lost. */
export const FORECLOSURE_CAP = 200
/** Debt fraction that turns the ledger "critical" (UI warning). */
export const FORECLOSURE_WARN = 0.6

/* ------------------------------------------------------------------ */
/* shop pricing                                                        */
/* ------------------------------------------------------------------ */

/** Flat cost to strike a card from your deck at a shop. */
export const SHOP_REMOVE_PRICE = 30
/** Price of a card = base + per-mana premium (higher cost = pricier). */
export function shopCardPrice(cost: number): number {
  return 18 + cost * 14
}

/* ------------------------------------------------------------------ */
/* events                                                              */
/* ------------------------------------------------------------------ */

export interface EventChoice {
  label: string
  /** short outcome flavor shown after resolving */
  result: string
  gold?: number
  hp?: number
  debt?: number
  card?: string
}

export interface EventDef {
  id: string
  title: string
  prompt: string
  choices: EventChoice[]
}

/** Seeded pool of `?` encounters — each offers a risk/reward decision. */
export const EVENTS: EventDef[] = [
  {
    id: "loan_shark",
    title: "The Loan Shark",
    prompt:
      "A pale eel slides from the murk with a smile full of teeth. \u201CQuick cash, friend. We settle up later.\u201D",
    choices: [
      { label: "Take the coin", result: "Pockets heavy, ledger heavier.", gold: 40, debt: 30 },
      { label: "Pay him off", result: "You buy some goodwill.", gold: -20, debt: -25 },
      { label: "Swim away", result: "You keep your fins clean.", },
    ],
  },
  {
    id: "sunken_safe",
    title: "The Sunken Safe",
    prompt:
      "A cracked strongbox glints in the silt. Prying it open will cost you a scale or two.",
    choices: [
      { label: "Force it open", result: "Coin spills out — so does some blood.", gold: 35, hp: -4 },
      { label: "Pick the lock", result: "Patience pays, modestly.", gold: 15 },
      { label: "Leave it", result: "Not worth the risk today.", },
    ],
  },
  {
    id: "cleaner_station",
    title: "The Cleaner Station",
    prompt:
      "A cluster of cleaner shrimp offer to pick you clean — for a tip.",
    choices: [
      { label: "Tip generously", result: "Good as new, wallet lighter.", gold: -15, hp: 8 },
      { label: "Tip a little", result: "A quick once-over.", gold: -5, hp: 4 },
      { label: "Decline", result: "You move along, itchy.", },
    ],
  },
  {
    id: "bribe_patrol",
    title: "The Reef Patrol",
    prompt:
      "Two barracuda in badges block the current. \u201CToll road, minnow. Or we take it out of your hide.\u201D",
    choices: [
      { label: "Pay the toll", result: "They wave you through.", gold: -25 },
      { label: "Refuse them", result: "You take a beating but keep your coin.", hp: -6 },
      { label: "Forge papers", result: "A little debt buys safe passage.", debt: 20 },
    ],
  },
]
