"use client"

import { Footprints, Heart, Swords } from "lucide-react"
import type { SummonDef } from "@/lib/game/summons"
import { spriteUrl } from "./sprites"
import { cn } from "@/lib/utils"

interface Props {
  def: SummonDef
  className?: string
}

/**
 * Static rendering of a summon definition. Deliberately shares CardFace's/
 * EnemyFace's footprint (180x235) so the library grid stays uniform across tabs.
 */
export function SummonFace({ def, className }: Props) {
  return (
    <div
      className={cn(
        "relative flex h-[235px] w-[180px] select-none flex-col overflow-hidden rounded-lg border shadow-lg",
        "border-black/40 bg-[oklch(0.9_0.03_85)] text-[oklch(0.2_0.03_260)]",
        className,
      )}
    >
      {/* art */}
      <div className="relative flex h-[110px] flex-col bg-[oklch(0.82_0.02_85)]">
        <span className="absolute right-1.5 top-1.5 rounded bg-teal px-1.5 py-0.5 font-display text-xs font-bold uppercase tracking-wider text-ocean-deep">
          Summon
        </span>
        <div className="flex flex-1 items-center justify-center">
          <img src={spriteUrl(def.icon)} alt={def.name} className="h-16 w-16 object-contain" />
        </div>
      </div>

      {/* body */}
      <div className="flex flex-1 flex-col gap-1 border-t border-black/20 px-2 pt-1.5">
        <h3 className="font-display text-[13px] font-bold uppercase leading-tight tracking-wide">
          {def.name || "Unnamed"}
        </h3>
        <div className="flex items-center gap-2.5 text-xs text-[oklch(0.35_0.02_260)]">
          <span className="flex items-center gap-1">
            <Footprints size={11} />
            {def.move}
          </span>
          <span>{def.range === 1 ? "Melee" : "Range"}</span>
        </div>
        <p className="text-xs text-[oklch(0.45_0.02_260)]">Sides with whoever casts it</p>
      </div>

      {/* footer: combat stats */}
      <div className="mt-auto flex items-center justify-between border-t border-black/30 bg-[oklch(0.78_0.02_85)] px-2 py-1 font-display text-xs font-bold uppercase tracking-wider text-[oklch(0.3_0.04_260)]">
        <span className="flex items-center gap-1">
          <Heart size={11} />
          {def.hp}
        </span>
        <span className="flex items-center gap-1">
          <Swords size={11} />
          {def.atk}
        </span>
      </div>
    </div>
  )
}
