import { CardTarget, CardType } from "../cards/enums"
import type { CardDef } from "../cards/models"
import { resolveCardEffects } from "../cards/services/effects.service"
import { FxKind } from "../battle/enums"
import type { FxEvent, GameState } from "../battle/models"
import { heroUnit } from "../shared"
import type { TrinketDef, TrinketTrigger } from "./trinket-def.model"
import { TRINKET_LIBRARY } from "./trinket-library"

export function applyStatModifiers(state: GameState, activeTrinketIds: string[]): void {
  const hero = heroUnit(state)
  if (!hero) return
  for (const id of activeTrinketIds) {
    const def = TRINKET_LIBRARY[id]
    if (!def?.stats) continue
    if (def.stats.maxHp) hero.maxHp += def.stats.maxHp
    if (def.stats.atk) hero.atk += def.stats.atk
    if (def.stats.move) hero.move += def.stats.move
  }
}

/**
 * Fire all trinket trigger effects for `trigger`. D4: there is exactly ONE
 * effect resolver in the engine — resolveCardEffects — and trinket effects
 * route through it instead of a duplicated switch. Each trigger's effects
 * are wrapped in a minimal synthetic card so the shared resolver applies
 * them against the hero (target = Self, no card-fx, hero as target/from).
 */
export function resolveTrigger(
  state: GameState,
  activeTrinketIds: string[],
  trigger: TrinketTrigger,
  fx: FxEvent[],
): void {
  const hero = heroUnit(state)
  for (const id of activeTrinketIds) {
    const def = TRINKET_LIBRARY[id]
    const effects = def?.triggers?.[trigger]
    if (!effects) continue
    // Restore old inert semantics (C1): trinkets must not damage or summon
    // units. The shared resolver targets the hero (self-synthetic card), so a
    // hypothetical `damage` effect would hit the hero — skip both kinds.
    const safe = effects.filter((e) => e.kind !== "damage" && e.kind !== "summon")
    if (!safe.length) continue
    resolveCardEffects(state, syntheticCard(def, trigger, safe), { targetUnit: hero, from: hero?.pos }, fx)
  }
}

function syntheticCard(def: TrinketDef, trigger: TrinketTrigger, effects: CardDef["effects"]): CardDef {
  return {
    id: def.id,
    name: def.name,
    type: CardType.Skill,
    cost: 0,
    value: 0,
    target: CardTarget.Self,
    desc: def.description,
    icon: def.icon,
    fx: FxKind.Coin,
    effects,
    log: `${def.name} triggers (${trigger}).`,
    logTone: "neutral",
  }
}

export function rollTrinketIds(
  seed: number,
  zoneIndex: number,
  nodeId: string,
  owned: string[],
  count: number,
): string[] {
  const rng = mulberry32(seed * 131 + zoneIndex * 313 + hashStr(nodeId))
  const pool = Object.keys(TRINKET_LIBRARY).filter((id) => !owned.includes(id))
  const rolled: string[] = []
  const shuffled = shuffle(rng, [...pool])
  for (const id of shuffled) {
    if (rolled.length >= count) break
    if (!rolled.includes(id)) rolled.push(id)
  }
  return rolled
}

export function rollTrinketIdsWeighted(
  seed: number,
  zoneIndex: number,
  nodeId: string,
  owned: string[],
  count: number,
  rarityFilter?: "common" | "uncommon" | "rare",
): string[] {
  const rng = mulberry32(seed * 157 + zoneIndex * 379 + hashStr(nodeId))
  let pool = Object.keys(TRINKET_LIBRARY).filter((id) => !owned.includes(id))
  if (rarityFilter) {
    pool = pool.filter((id) => TRINKET_LIBRARY[id]?.rarity === rarityFilter)
  }
  const rolled: string[] = []
  const shuffled = shuffle(rng, [...pool])
  for (const id of shuffled) {
    if (rolled.length >= count) break
    if (!rolled.includes(id)) rolled.push(id)
  }
  return rolled
}

export function rollShopTrinkets(
  seed: number,
  zoneIndex: number,
  nodeId: string,
  owned: string[],
): { trinketId: string; price: number }[] {
  const rng = mulberry32(seed * 53 + zoneIndex * 197 + hashStr(nodeId))
  const pool = Object.keys(TRINKET_LIBRARY).filter((id) => !owned.includes(id))
  const count = pool.length >= 1 ? Math.min(2, Math.max(1, 1 + Math.floor(rng() * 2))) : 0
  const shuffled = shuffle(rng, [...pool])
  return shuffled.slice(0, count).map((trinketId) => ({
    trinketId,
    price: TRINKET_LIBRARY[trinketId]?.rarity === "common" ? 30
      : TRINKET_LIBRARY[trinketId]?.rarity === "uncommon" ? 45
      : 70,
  }))
}

/* ------------------------------------------------------------------ */
/* seeded helpers (local copies to avoid engine import cycle)          */
/* ------------------------------------------------------------------ */

function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function shuffle<T>(rng: () => number, arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

function hashStr(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h & 0xffffffff
}