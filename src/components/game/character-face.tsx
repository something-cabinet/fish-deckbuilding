"use client"

import { Footprints, Heart, Layers, Swords } from "lucide-react"
import type { CharacterDef } from "@/lib/game/characters"
import { spriteUrl } from "./sprites"
import { cn } from "@/lib/utils"

/**
 * Card-sized character tile: portrait sprite, name, the three authored stats
 * and the starter-deck size. Shared by the design library grid and the editor's
 * preview rail so both read the same.
 */
export function CharacterFace({ def, className }: { def: CharacterDef; className?: string }) {
  return (
    <div
      className={cn(
        "flex w-[150px] flex-col items-center gap-2 rounded-xl border-2 border-gold/40 bg-ocean-deep/60 p-3 text-center",
        className,
      )}
    >
      <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border border-gold/40 bg-gold/10">
        <img
          src={spriteUrl(def.icon)}
          alt={def.name ? `${def.name} portrait` : "Character portrait"}
          className="h-12 w-12 object-contain"
        />
      </div>

      <h3 className="font-display text-sm font-bold uppercase leading-tight tracking-wide text-foreground">
        {def.name || "Unnamed"}
      </h3>
      {def.title && (
        <span className="font-display text-xs font-bold uppercase tracking-[0.18em] text-gold">
          {def.title}
        </span>
      )}

      {def.description && (
        <p className="text-xs leading-snug text-muted-foreground">{def.description}</p>
      )}

      <div className="flex w-full items-center justify-center gap-2 border-t border-white/10 pt-2 font-display text-xs font-bold uppercase tracking-wider">
        <StatPip icon={Heart} value={def.stats.maxHp} className="text-enemy" label="health" />
        <StatPip icon={Swords} value={def.stats.atk} className="text-gold" label="melee damage" />
        <StatPip icon={Footprints} value={def.stats.move} className="text-teal" label="speed" />
      </div>

      <span className="flex items-center gap-1 font-display text-xs uppercase tracking-wider text-muted-foreground">
        <Layers size={11} />
        {def.starterDeck.length} card{def.starterDeck.length === 1 ? "" : "s"}
      </span>
    </div>
  )
}

function StatPip({
  icon: Icon,
  value,
  className,
  label,
}: {
  icon: React.ElementType
  value: number
  className?: string
  label: string
}) {
  return (
    <span className={cn("flex items-center gap-1", className)} title={label}>
      <Icon size={12} aria-hidden />
      <span className="sr-only">{label}</span>
      {value}
    </span>
  )
}
