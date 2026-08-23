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
 * (top-left), type badge (top-right) and the card name banded across the bottom
 * riding over it. Art is 16:10 and `object-cover`, so the panel holds that ratio
 * at every card size and one image serves all of them. A card whose art file is
 * missing falls back to its lucide icon.
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
          "absolute left-0.5 top-0.5 z-10 flex items-center justify-center rounded-full border border-black/50 bg-ocean-deep font-display font-bold text-gold shadow",
          large ? "h-6 w-6 text-xs" : "h-5 w-5 text-[10px]",
        )}
      >
        {def.cost}
      </span>

      {/* type */}
      <span
        className={cn(
          "absolute right-0.5 top-0.5 z-10 rounded px-1 py-px font-display font-bold uppercase leading-tight tracking-wide",
          large ? "text-[9px]" : "text-[8px]",
          TYPE_STYLES[def.type],
        )}
      >
        {def.type}
      </span>

      {/* name: banded across the foot of the artwork, over a scrim so it stays
          legible whatever the image behind it looks like */}
      <div className="absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black/80 via-black/55 to-transparent px-1.5 pb-1 pt-3">
        <h3
          className={cn(
            "text-center font-display font-bold uppercase leading-tight tracking-wide text-white [text-shadow:0_1px_2px_rgb(0_0_0/0.9)]",
            large ? "text-[13px]" : "text-[11px]",
          )}
        >
          {def.name || "Untitled"}
        </h3>
      </div>
    </div>
  )
}

interface Props {
  def: CardDef
  size?: "sm" | "md" | "lg"
  className?: string
}

const SIZES = {
  sm: "h-[202px] w-[149px]",
  md: "h-[235px] w-[180px]",
  lg: "h-[298px] w-[226px]",
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
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden border-t border-black/20 px-1.5 py-1">
        <p
          className={cn(
            "min-h-0 flex-1 overflow-hidden [mask-image:linear-gradient(to_bottom,black_calc(100%-10px),transparent)] leading-snug text-[oklch(0.35_0.02_260)]",
            large ? "text-[11px]" : "text-[10px]",
          )}
        >
          {def.desc || "No description."}
        </p>
      </div>

      {/* footer: target (+ range) + sell value */}
      <div className="mt-auto flex shrink-0 items-center justify-between border-t border-black/30 bg-[oklch(0.78_0.02_85)] px-1.5 py-0.5 font-display text-[10px] font-bold uppercase tracking-wider text-[oklch(0.3_0.04_260)]">
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
