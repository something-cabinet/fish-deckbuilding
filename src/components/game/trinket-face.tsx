"use client"

import type { TrinketDef, TrinketRarity, TrinketTrigger } from "@/lib/game/trinkets"
import { getCardIcon } from "./card-icons"
import { cn } from "@/lib/utils"

/** Rarity is the trinket's only colour cue — keep it identical everywhere. */
export const RARITY_STYLES: Record<TrinketRarity, { border: string; text: string; tile: string }> = {
  common: { border: "border-white/20", text: "text-muted-foreground", tile: "bg-white/[0.04]" },
  uncommon: { border: "border-teal/50", text: "text-teal", tile: "bg-teal/10" },
  rare: { border: "border-gold/50", text: "text-gold", tile: "bg-gold/10" },
}

export const TRIGGER_LABELS: Record<TrinketTrigger, string> = {
  onCombatStart: "Battle start",
  onTurnStart: "Turn start",
  onCardSold: "Card sold",
  onEnemyKilled: "Enemy killed",
}

/** One-line summary of a stat block, e.g. "+5 max HP · +1 atk". */
export function statSummary(stats: TrinketDef["stats"]): string {
  if (!stats) return ""
  const parts: string[] = []
  if (stats.maxHp) parts.push(`${stats.maxHp > 0 ? "+" : ""}${stats.maxHp} max HP`)
  if (stats.atk) parts.push(`${stats.atk > 0 ? "+" : ""}${stats.atk} atk`)
  if (stats.move) parts.push(`${stats.move > 0 ? "+" : ""}${stats.move} move`)
  return parts.join(" · ")
}

/**
 * Card-sized trinket tile: art, name, rarity and rules text. Used by the design
 * library grid and by the editor's preview rail so both read the same.
 */
export function TrinketFace({ def, className }: { def: TrinketDef; className?: string }) {
  const Icon = getCardIcon(def.icon)
  const rarity = RARITY_STYLES[def.rarity]
  const stats = statSummary(def.stats)
  const triggers = Object.entries(def.triggers ?? {}).filter(([, fx]) => (fx?.length ?? 0) > 0)

  return (
    <div
      className={cn(
        "flex w-[150px] flex-col items-center gap-2 rounded-xl border-2 bg-ocean-deep/60 p-3 text-center",
        rarity.border,
        className,
      )}
    >
      <div
        className={cn(
          "flex h-14 w-14 items-center justify-center rounded-xl border",
          rarity.border,
          rarity.tile,
        )}
      >
        <Icon size={26} className={rarity.text} />
      </div>

      <h3 className="font-display text-xs font-bold uppercase leading-tight tracking-wide text-foreground">
        {def.name || "Unnamed"}
      </h3>
      <span
        className={cn(
          "font-display text-xs font-bold uppercase tracking-[0.18em]",
          rarity.text,
        )}
      >
        {def.rarity}
      </span>

      {def.description && (
        <p className="text-xs leading-snug text-muted-foreground">{def.description}</p>
      )}

      {stats && (
        <span className="font-display text-xs font-bold uppercase tracking-wider text-teal">
          {stats}
        </span>
      )}

      {triggers.length > 0 && (
        <div className="flex w-full flex-col gap-0.5 border-t border-white/10 pt-1.5">
          {triggers.map(([trigger, fx]) => (
            <span
              key={trigger}
              className="font-display text-xs uppercase tracking-wider text-muted-foreground"
            >
              {TRIGGER_LABELS[trigger as TrinketTrigger]} · {fx!.length} fx
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
