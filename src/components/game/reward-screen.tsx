"use client"

import { Coins, Sparkles } from "lucide-react"
import { CardFace } from "./card-face"
import { CARD_LIBRARY } from "@/lib/game/data"

interface Props {
  cardIds: string[]
  gold: number
  onPick: (cardId: string) => void
}

export function RewardScreen({ cardIds, gold, onPick }: Props) {
  return (
    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-ocean-deep/90 p-6 backdrop-blur-sm animate-fm-fade-in">
      <div className="text-center">
        <p className="font-display text-xs uppercase tracking-[0.4em] text-muted-foreground">
          Spoils of the Collection
        </p>
        <h2 className="mt-1 font-display text-4xl font-bold uppercase tracking-widest text-gold">
          Choose a Card
        </h2>
        <p className="mt-2 flex items-center justify-center gap-2 font-display text-sm uppercase tracking-wider text-gold/80">
          <Coins size={14} />
          +{gold} gold banked
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-4">
        {cardIds.map((id) => {
          const def = CARD_LIBRARY[id]
          if (!def) return null
          return (
            <button
              type="button"
              key={id}
              onClick={() => onPick(id)}
              className="group relative transition-transform hover:-translate-y-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold"
            >
              <span className="pointer-events-none absolute -top-3 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1 rounded-full border border-gold/50 bg-ocean-deep px-2 py-0.5 font-display text-[10px] font-bold uppercase tracking-widest text-gold opacity-0 transition-opacity group-hover:opacity-100">
                <Sparkles size={10} />
                Add to deck
              </span>
              <CardFace def={def} size="lg" />
            </button>
          )
        })}
      </div>

      <p className="max-w-sm text-center text-xs text-muted-foreground">
        The card is added straight to your deck — it will appear in your next hand.
      </p>
    </div>
  )
}
