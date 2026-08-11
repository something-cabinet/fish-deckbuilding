import type { CardEffect } from "../cards"

export type TrinketRarity = "common" | "uncommon" | "rare"
export type TrinketTrigger = "onCombatStart" | "onTurnStart" | "onCardSold" | "onEnemyKilled"

export interface TrinketDef {
  id: string
  name: string
  description: string
  icon: string
  rarity: TrinketRarity
  stats?: {
    maxHp?: number
    atk?: number
    move?: number
  }
  triggers?: Partial<Record<TrinketTrigger, CardEffect[]>>
}