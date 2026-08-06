"use client"

import { Coins, Footprints, Heart, Layers, Sparkles, Swords } from "lucide-react"
import { UnitKind, type EnemyDef } from "@/lib/game/units"
import { cn } from "@/lib/utils"

const SPRITE_PATH = "/sprites/"

export const KIND_LABELS: Record<UnitKind, string> = {
  [UnitKind.Hero]: "Hero",
  [UnitKind.Goon]: "Goon",
  [UnitKind.Thug]: "Thug",
  [UnitKind.Enforcer]: "Enforcer",
  [UnitKind.Boss]: "Boss",
}

const KIND_STYLES: Record<UnitKind, string> = {
  [UnitKind.Hero]: "bg-teal text-ocean-deep",
  [UnitKind.Goon]: "bg-enemy text-white",
  [UnitKind.Thug]: "bg-enemy text-white",
  [UnitKind.Enforcer]: "bg-teal text-ocean-deep",
  [UnitKind.Boss]: "bg-gold text-ocean-deep",
}

interface Props {
  def: EnemyDef
  className?: string
}

/**
 * Static rendering of an enemy definition. Deliberately shares CardFace's
 * footprint (150x196) so the library grid stays uniform across both tabs.
 */
export function EnemyFace({ def, className }: Props) {
  const deckSize = def.deck.reduce((n, e) => n + e.count, 0)

  return (
    <div
      className={cn(
        "relative flex h-[196px] w-[150px] select-none flex-col overflow-hidden rounded-lg border shadow-lg",
        "border-black/40 bg-[oklch(0.9_0.03_85)] text-[oklch(0.2_0.03_260)]",
        className,
      )}
    >
      {/* kind + art */}
      <div className="relative flex h-[92px] flex-col bg-[oklch(0.82_0.02_85)]">
        <span
          className={cn(
            "absolute right-1.5 top-1.5 rounded px-1.5 py-0.5 font-display text-[9px] font-bold uppercase tracking-wider",
            KIND_STYLES[def.kind] ?? "bg-enemy text-white",
          )}
        >
          {KIND_LABELS[def.kind] ?? "Unknown"}
        </span>
        {def.isMinion && (
          <span className="absolute left-1.5 top-1.5 z-10 flex items-center gap-1 rounded-full border border-gold/40 bg-ocean-deep px-1.5 py-0.5 font-display text-[8px] font-bold uppercase tracking-wider text-gold shadow">
            <Sparkles size={7} />
            Minion
          </span>
        )}
        <div className="flex flex-1 items-center justify-center">
          <img
            src={`${SPRITE_PATH}${def.icon}.png`}
            alt={def.name}
            className="h-16 w-16 object-contain"
          />
        </div>
      </div>

      {/* body: name + the stats that do not fit the footer */}
      <div className="flex flex-1 flex-col gap-1 border-t border-black/20 px-2 pt-1.5">
        <h3 className="font-display text-[13px] font-bold uppercase leading-tight tracking-wide">
          {def.name || "Unnamed"}
        </h3>
        <div className="flex items-center gap-2.5 text-[10px] text-[oklch(0.35_0.02_260)]">
          <span className="flex items-center gap-1">
            <Footprints size={11} />
            {def.move}
          </span>
          <span className="flex items-center gap-1">
            <Layers size={11} />
            {deckSize} {deckSize === 1 ? "card" : "cards"}
          </span>
        </div>
      </div>

      {/* footer: combat stats */}
      <div className="mt-auto flex items-center justify-between border-t border-black/30 bg-[oklch(0.78_0.02_85)] px-2 py-1 font-display text-[10px] font-bold uppercase tracking-wider text-[oklch(0.3_0.04_260)]">
        <span className="flex items-center gap-1">
          <Heart size={11} />
          {def.hp}
        </span>
        <span className="flex items-center gap-1">
          <Swords size={11} />
          {def.atk}
        </span>
        <span>{def.range === 1 ? "Melee" : "Range"}</span>
        <span className="flex items-center gap-1">
          <Coins size={11} />
          {def.goldDrop}
        </span>
      </div>
    </div>
  )
}
