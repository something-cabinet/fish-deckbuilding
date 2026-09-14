/**
 * A goon-tier unit that a card can summon onto the battlefield. Unlike
 * EnemyDef, a SummonDef carries no team — the same template can be summoned
 * by a player card or (eventually) an enemy card, so allegiance is assigned
 * at cast time from whoever played the card, not authored here.
 */
export interface SummonDef {
  id: string
  name: string
  hp: number
  atk: number
  move: number
  range: number
  icon: string
  aiProfile?: { archetype: string; weights?: Record<string, number> }
}
