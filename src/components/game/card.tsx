"use client"

import {
  Coins,
  FileX2,
  Fish,
  Hammer,
  HeartPulse,
  Mail,
  PhoneCall,
  Skull,
  TrendingUp,
  type LucideIcon,
} from "lucide-react"
import type { CardInstance } from "@/lib/game/types"
import { cn } from "@/lib/utils"

const ICONS: Record<string, LucideIcon> = {
  Mail,
  PhoneCall,
  FileX2,
  Hammer,
  Coins,
  TrendingUp,
  Skull,
  HeartPulse,
  Fish,
}

const TYPE_STYLES: Record<string, string> = {
  attack: "bg-enemy text-white",
  skill: "bg-teal text-ocean-deep",
  summon: "bg-gold text-ocean-deep",
}

interface Props {
  card: CardInstance
  playable: boolean
  dragging: boolean
  armed?: boolean
  onPointerDown: (e: React.PointerEvent, card: CardInstance) => void
  onTap?: (card: CardInstance) => void
  onSell: (card: CardInstance) => void
  compact?: boolean
}

export function GameCard({ card, playable, dragging, armed, onPointerDown, onTap, onSell, compact }: Props) {
  const { def } = card
  const Icon = ICONS[def.icon] ?? Fish

  return (
    <div
      data-card-uid={card.uid}
      onPointerDown={(e) => onPointerDown(e, card)}
      onClick={() => onTap?.(card)}
      className={cn(
        "group relative flex select-none flex-col overflow-hidden rounded-lg border text-left shadow-lg transition-all",
        "border-black/40 bg-[oklch(0.9_0.03_85)] text-[oklch(0.2_0.03_260)]",
        compact ? "h-[168px] w-[124px]" : "h-[196px] w-[150px]",
        dragging ? "opacity-30" : "hover:-translate-y-3 hover:shadow-2xl",
        playable
          ? "cursor-grab ring-1 ring-gold/40 active:cursor-grabbing"
          : "cursor-not-allowed opacity-70 saturate-50",
        !dragging && playable && "hover:ring-2 hover:ring-gold",
        armed && "-translate-y-3 ring-2 ring-gold shadow-2xl",
      )}
    >
      {/* cost */}
      <span className="absolute left-1.5 top-1.5 z-10 flex h-7 w-7 items-center justify-center rounded-full border border-black/50 bg-ocean-deep font-display text-sm font-bold text-gold shadow">
        {def.cost}
      </span>

      {/* type + art */}
      <div className="relative flex h-[92px] flex-col bg-[oklch(0.82_0.02_85)]">
        <span
          className={cn(
            "absolute right-1.5 top-1.5 rounded px-1.5 py-0.5 font-display text-[9px] font-bold uppercase tracking-wider",
            TYPE_STYLES[def.type],
          )}
        >
          {def.type}
        </span>
        <div className="flex flex-1 items-center justify-center">
          <Icon
            className={cn(
              "opacity-80",
              def.type === "attack" ? "text-enemy" : def.type === "skill" ? "text-teal" : "text-gold-dim",
            )}
            size={compact ? 34 : 40}
            strokeWidth={1.75}
          />
        </div>
      </div>

      {/* body */}
      <div className="flex flex-1 flex-col gap-1 border-t border-black/20 px-2 pt-1.5">
        <h3 className="font-display text-[13px] font-bold uppercase leading-tight tracking-wide">{def.name}</h3>
        <p className="text-[10px] leading-snug text-[oklch(0.35_0.02_260)]">{def.desc}</p>
      </div>

      {/* sell footer */}
      <button
        type="button"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation()
          onSell(card)
        }}
        className="mt-auto flex items-center justify-center gap-1 border-t border-black/30 bg-[oklch(0.78_0.02_85)] py-1 font-display text-[10px] font-bold uppercase tracking-wider text-[oklch(0.3_0.04_260)] transition-colors hover:bg-gold hover:text-ocean-deep"
      >
        Sell
        <Coins size={11} />
        <span>{def.value}</span>
      </button>
    </div>
  )
}
