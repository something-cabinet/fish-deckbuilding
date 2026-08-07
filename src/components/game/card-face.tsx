"use client"

import { Coins } from "lucide-react"
import { CardTarget, CardType, type CardDef } from "@/lib/game/cards"
import { getCardIcon } from "./card-icons"
import { cn } from "@/lib/utils"

/** Shared with any surface that needs to badge a card by type (e.g. deck-entry detail views). */
export const TYPE_STYLES: Record<CardType, string> = {
  [CardType.Attack]: "bg-enemy text-white",
  [CardType.Skill]: "bg-teal text-ocean-deep",
  [CardType.Summon]: "bg-gold text-ocean-deep",
}

export const TARGET_LABELS: Record<CardTarget, string> = {
  [CardTarget.Enemy]: "Enemy",
  [CardTarget.Ally]: "Ally",
  [CardTarget.Unit]: "Any unit",
  [CardTarget.Self]: "Self",
  [CardTarget.EmptyTile]: "Empty tile",
}

interface Props {
  def: CardDef
  size?: "sm" | "md" | "lg"
  className?: string
}

const SIZES = {
  sm: "h-[168px] w-[124px]",
  md: "h-[196px] w-[150px]",
  lg: "h-[248px] w-[188px]",
}

/** Static, non-interactive rendering of a card definition. */
export function CardFace({ def, size = "md", className }: Props) {
  const Icon = getCardIcon(def.icon)
  const large = size === "lg"

  return (
    <div
      className={cn(
        "relative flex select-none flex-col overflow-hidden rounded-lg border shadow-lg",
        "border-black/40 bg-[oklch(0.9_0.03_85)] text-[oklch(0.2_0.03_260)]",
        SIZES[size],
        className,
      )}
    >
      {/* cost */}
      <span
        className={cn(
          "absolute left-1.5 top-1.5 z-10 flex items-center justify-center rounded-full border border-black/50 bg-ocean-deep font-display font-bold text-gold shadow",
          large ? "h-9 w-9 text-lg" : "h-7 w-7 text-sm",
        )}
      >
        {def.cost}
      </span>

      {/* type + art */}
      <div
        className={cn(
          "relative flex flex-col bg-[oklch(0.82_0.02_85)]",
          large ? "h-[116px]" : "h-[92px]",
        )}
      >
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
              def.type === CardType.Attack
                ? "text-enemy"
                : def.type === CardType.Skill
                  ? "text-teal"
                  : "text-gold-dim",
            )}
            size={large ? 52 : 40}
            strokeWidth={1.75}
          />
        </div>
      </div>

      {/* body */}
      <div className="flex flex-1 flex-col gap-1 border-t border-black/20 px-2 pt-1.5">
        <h3
          className={cn(
            "font-display font-bold uppercase leading-tight tracking-wide",
            large ? "text-[15px]" : "text-[13px]",
          )}
        >
          {def.name || "Untitled"}
        </h3>
        <p
          className={cn(
            "leading-snug text-[oklch(0.35_0.02_260)]",
            large ? "text-[11px]" : "text-[10px]",
          )}
        >
          {def.desc || "No description."}
        </p>
      </div>

      {/* footer: target + sell value */}
      <div className="mt-auto flex items-center justify-between border-t border-black/30 bg-[oklch(0.78_0.02_85)] px-2 py-1 font-display text-[10px] font-bold uppercase tracking-wider text-[oklch(0.3_0.04_260)]">
        <span>{TARGET_LABELS[def.target] ?? def.target}</span>
        <span className="flex items-center gap-1">
          <Coins size={11} />
          {def.value}
        </span>
      </div>
    </div>
  )
}
