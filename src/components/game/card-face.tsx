"use client"

import { useState } from "react"
import { Coins, Crosshair, Radius } from "lucide-react"
import { AOE_SINGLE_TILE, CardTarget, CardType, aoeTileCount, type CardDef } from "@/lib/game/cards"
import { cardArtName, cardArtUrl } from "./card-art"
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

/** Tint for the fallback icon, so a missing image still reads as its card type. */
const ICON_TINTS: Record<CardType, string> = {
  [CardType.Attack]: "text-enemy",
  [CardType.Skill]: "text-teal",
  [CardType.Summon]: "text-gold-dim",
}

/**
 * The top slab every card surface shares: full-bleed artwork with the cost pill
 * and type badge riding over it. Art is 16:10 and `object-cover`, so the panel
 * holds that ratio at every card size and one image serves all of them. A card
 * whose art file is missing falls back to its lucide icon.
 */
export function CardArtPanel({ def, large = false }: { def: CardDef; large?: boolean }) {
  const [artFailed, setArtFailed] = useState(false)
  const Icon = getCardIcon(def.icon)

  return (
    <div className="relative aspect-[16/10] w-full shrink-0 overflow-hidden bg-[oklch(0.82_0.02_85)]">
      {artFailed ? (
        <div className="flex h-full items-center justify-center">
          <Icon
            className={cn("opacity-80", ICON_TINTS[def.type])}
            size={large ? 52 : 40}
            strokeWidth={1.75}
          />
        </div>
      ) : (
        <img
          src={cardArtUrl(cardArtName(def))}
          alt=""
          draggable={false}
          onError={() => setArtFailed(true)}
          className="h-full w-full object-cover"
        />
      )}

      {/* cost */}
      <span
        className={cn(
          "absolute left-1.5 top-1.5 z-10 flex items-center justify-center rounded-full border border-black/50 bg-ocean-deep font-display font-bold text-gold shadow",
          large ? "h-9 w-9 text-lg" : "h-7 w-7 text-sm",
        )}
      >
        {def.cost}
      </span>

      {/* type */}
      <span
        className={cn(
          "absolute right-1.5 top-1.5 z-10 rounded px-1.5 py-0.5 font-display text-xs font-bold uppercase tracking-wider",
          TYPE_STYLES[def.type],
        )}
      >
        {def.type}
      </span>
    </div>
  )
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
      <CardArtPanel def={def} large={large} />

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
            large ? "text-xs" : "text-xs",
          )}
        >
          {def.desc || "No description."}
        </p>
      </div>

      {/* footer: target (+ range) + sell value */}
      <div className="mt-auto flex items-center justify-between border-t border-black/30 bg-[oklch(0.78_0.02_85)] px-2 py-1 font-display text-xs font-bold uppercase tracking-wider text-[oklch(0.3_0.04_260)]">
        <span className="flex items-center gap-1.5">
          <span>{TARGET_LABELS[def.target] ?? def.target}</span>
          {def.target !== CardTarget.Self && (
            <span className="flex items-center gap-0.5" title={`Cast range ${def.range}`}>
              <Crosshair size={10} aria-hidden />
              {def.range}
            </span>
          )}
          {def.aoe > AOE_SINGLE_TILE && (
            <span
              className="flex items-center gap-0.5 text-[oklch(0.45_0.16_25)]"
              title={`Blast covers ${aoeTileCount(def.aoe)} tiles`}
            >
              <Radius size={10} aria-hidden />
              {aoeTileCount(def.aoe)}
            </span>
          )}
        </span>
        <span className="flex items-center gap-1">
          <Coins size={11} />
          {def.value}
        </span>
      </div>
    </div>
  )
}
