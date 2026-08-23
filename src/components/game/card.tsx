"use client"

import { Coins } from "lucide-react"
import { type CardInstance } from "@/lib/game/cards"
import { CardArtPanel } from "./card-face"
import { cn } from "@/lib/utils"

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

  return (
    <div
      data-card-uid={card.uid}
      onPointerDown={(e) => onPointerDown(e, card)}
      onClick={() => onTap?.(card)}
      className={cn(
        // cards are always fully opaque: they overlap in hand, so anything see-through
        // reads as a rendering bug. State is carried by filters, ring and shadow instead.
        "group relative flex shrink-0 select-none flex-col overflow-hidden rounded-lg border text-left opacity-100 shadow-lg transition-all",
        "border-black/40 bg-[oklch(0.9_0.03_85)] text-[oklch(0.2_0.03_260)]",
        compact ? "h-[202px] w-[149px]" : "h-[235px] w-[180px]",
        // the card being dragged stays in place as a dimmed-but-solid slot marker
        dragging && "brightness-[0.45] saturate-[0.25]",
        playable
          ? "cursor-grab ring-1 ring-gold/40 active:cursor-grabbing"
          : "cursor-not-allowed brightness-[0.82] saturate-[0.35]",
        !dragging && playable && "hover:ring-2 hover:ring-gold",
        armed && "ring-2 ring-gold shadow-2xl",
      )}
    >
      <CardArtPanel def={def} />

      {/* body: the name rides on the artwork, so this is description only */}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden border-t border-black/20 px-1.5 py-1">
        <p className="min-h-0 flex-1 overflow-hidden [mask-image:linear-gradient(to_bottom,black_calc(100%-10px),transparent)] text-[10px] leading-snug text-[oklch(0.35_0.02_260)]">{def.desc}</p>
      </div>

      {/* sell footer */}
      <button
        type="button"
        aria-label={`Sell ${def.name} for ${def.value} coin`}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation()
          onSell(card)
        }}
        className="mt-auto flex shrink-0 items-center justify-center gap-1 border-t border-black/30 bg-[oklch(0.78_0.02_85)] py-0.5 font-display text-[10px] font-bold uppercase tracking-wider text-[oklch(0.3_0.04_260)] transition-colors hover:bg-gold hover:text-ocean-deep"
      >
        Sell
        <Coins size={11} />
        <span>{def.value}</span>
      </button>
    </div>
  )
}
