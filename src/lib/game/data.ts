import type { CardDef, Unit } from "./types"

export const CARD_LIBRARY: Record<string, CardDef> = {
  demand_letter: {
    id: "demand_letter",
    name: "Demand Letter",
    type: "attack",
    cost: 1,
    value: 1,
    target: "enemy",
    desc: "Deal 2 damage to a target enemy.",
    icon: "Mail",
    fx: "letter",
  },
  collection_call: {
    id: "collection_call",
    name: "Collection Call",
    type: "attack",
    cost: 2,
    value: 1,
    target: "enemy",
    desc: "Deal 3 damage to a target enemy.",
    icon: "PhoneCall",
    fx: "phone",
  },
  foreclose: {
    id: "foreclose",
    name: "Foreclose",
    type: "attack",
    cost: 4,
    value: 2,
    target: "enemy",
    desc: "Deal 6 damage to a target enemy.",
    icon: "FileX2",
    fx: "gavel",
  },
  kneecap: {
    id: "kneecap",
    name: "Kneecap",
    type: "attack",
    cost: 2,
    value: 1,
    target: "enemy",
    desc: "Deal 2 damage and weaken the target's attack by 1.",
    icon: "Hammer",
    fx: "shock",
  },
  cash_flow: {
    id: "cash_flow",
    name: "Cash Flow",
    type: "skill",
    cost: 1,
    value: 1,
    target: "self",
    desc: "Launder 3 coin into your pocket.",
    icon: "Coins",
    fx: "coin",
  },
  market_rate: {
    id: "market_rate",
    name: "Market Rate",
    type: "skill",
    cost: 1,
    value: 1,
    target: "self",
    desc: "Draw 2 cards.",
    icon: "TrendingUp",
    fx: "draw",
  },
  loan_shark: {
    id: "loan_shark",
    name: "Loan Shark",
    type: "attack",
    cost: 3,
    value: 2,
    target: "enemy",
    desc: "Deal 4 damage and heal your boss 2 HP.",
    icon: "Skull",
    fx: "shock",
  },
  hush_money: {
    id: "hush_money",
    name: "Hush Money",
    type: "skill",
    cost: 2,
    value: 2,
    target: "ally",
    desc: "Restore 5 HP to a friendly fish.",
    icon: "HeartPulse",
    fx: "heal",
  },
  muscle: {
    id: "muscle",
    name: "Hired Muscle",
    type: "summon",
    cost: 3,
    value: 2,
    target: "empty-tile",
    desc: "Summon a Goon (5 HP / 2 ATK) on an empty tile.",
    icon: "Fish",
    fx: "summon",
  },
}

/** The player's starting deck (list of card library ids, may repeat). */
export const STARTER_DECK: string[] = [
  "demand_letter",
  "demand_letter",
  "demand_letter",
  "collection_call",
  "collection_call",
  "foreclose",
  "foreclose",
  "kneecap",
  "kneecap",
  "cash_flow",
  "cash_flow",
  "market_rate",
  "market_rate",
  "loan_shark",
  "hush_money",
  "muscle",
  "muscle",
]

export const HERO_DEF: Omit<Unit, "id" | "pos"> = {
  name: "Guppy",
  kind: "hero",
  team: "player",
  hp: 14,
  maxHp: 14,
  atk: 2,
  move: 3,
  range: 1,
  hasMoved: false,
  hasActed: false,
  buffAtk: 0,
}

export interface EnemySpawn {
  name: string
  kind: Unit["kind"]
  x: number
  y: number
  hp: number
  atk: number
  move: number
}

export const ENEMY_SPAWNS: EnemySpawn[] = [
  { name: "Thug", kind: "thug", x: 6, y: 1, hp: 4, atk: 2, move: 2 },
  { name: "Thug", kind: "thug", x: 6, y: 3, hp: 4, atk: 2, move: 2 },
  { name: "Enforcer", kind: "enforcer", x: 7, y: 0, hp: 6, atk: 3, move: 2 },
  { name: "Enforcer", kind: "enforcer", x: 7, y: 4, hp: 6, atk: 3, move: 2 },
  { name: "The Boss", kind: "boss", x: 8, y: 2, hp: 16, atk: 4, move: 1 },
]

export const GOON_DEF = { name: "Goon", kind: "goon" as const, hp: 5, atk: 2, move: 2 }
