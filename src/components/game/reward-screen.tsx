"use client"

import { useState } from "react"
import { Coins, Gem, Sparkles } from "lucide-react"
import { CardFace } from "./card-face"
import { CARD_LIBRARY } from "@/lib/game/cards"
import { TRINKET_LIBRARY, getTrinketDef } from "@/lib/game/trinkets"
import { getCardIcon } from "./card-icons"
import { cn } from "@/lib/utils"

interface Props {
  cardIds: string[]
  gold: number
  trinketIds?: string[]
  onPick: (cardId: string, trinketId?: string) => void
  onSkip?: () => void
}

export function RewardScreen({ cardIds, gold, trinketIds = [], onPick, onSkip }: Props) {
  const [selectedTrinket, setSelectedTrinket] = useState<string | undefined>(undefined)
  const [picked, setPicked] = useState(false)
  const trinketsOnly = cardIds.length === 0 && trinketIds.length > 0

  const handleCardPick = (cardId: string) => {
    if (picked) return
    setPicked(true)
    onPick(cardId, selectedTrinket)
  }

  const handleTrinketPick = (trinketId: string) => {
    if (picked) return
    setPicked(true)
    onPick("", trinketId)
  }

  return (
    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-ocean-deep/90 p-6 backdrop-blur-sm animate-fm-fade-in">
      <div className="text-center">
        <p className="font-display text-xs uppercase tracking-[0.4em] text-muted-foreground">
          Spoils of the Collection
        </p>
        <h2 className="mt-1 font-display text-4xl font-bold uppercase tracking-widest text-gold">
          {trinketsOnly ? "Choose a Trinket" : "Choose a Card"}
        </h2>
        <p className="mt-2 flex items-center justify-center gap-2 font-display text-sm uppercase tracking-wider text-gold/80">
          <Coins size={14} />
          +{gold} gold banked
        </p>
      </div>

      {!trinketsOnly && (
        <div className="flex flex-wrap items-center justify-center gap-4">
          {cardIds.map((id) => {
            const def = CARD_LIBRARY[id]
            if (!def) return null
            return (
              <button
                type="button"
                key={id}
                onClick={() => handleCardPick(id)}
                disabled={picked}
                className="group relative transition-transform hover:-translate-y-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold"
              >
                <span className="pointer-events-none absolute -top-3 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1 rounded-full border border-gold/50 bg-ocean-deep px-2 py-0.5 font-display text-xs font-bold uppercase tracking-widest text-gold opacity-0 transition-opacity group-hover:opacity-100">
                  <Sparkles size={10} />
                  Add to deck
                </span>
                <CardFace def={def} size="lg" />
              </button>
            )
          })}
        </div>
      )}

      {trinketIds.length > 0 && (
        <>
          <h3 className="flex items-center gap-2 font-display text-xs uppercase tracking-[0.3em] text-muted-foreground">
            <Gem size={13} />
            {trinketsOnly ? "Pick a trinket to carry for the rest of the run" : "Choose a Trinket"}
          </h3>
          <div className="flex flex-wrap items-center justify-center gap-4">
            {trinketIds.map((id) => {
              const def = TRINKET_LIBRARY[id]
              if (!def) return null
              const TrinketIcon = getCardIcon(def.icon)

              if (trinketsOnly) {
                return (
                  <button
                    type="button"
                    key={id}
                    onClick={() => handleTrinketPick(id)}
                    disabled={picked}
                    className="group relative flex flex-col items-center gap-1.5 rounded-xl border-2 border-white/10 bg-white/[0.03] p-3 transition-all hover:border-gold/50 hover:-translate-y-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold"
                  >
                    <TrinketIcon size={24} className="text-gold/60 transition-colors group-hover:text-gold" />
                    <p className="font-display text-xs font-bold uppercase tracking-wider text-foreground">
                      {def.name}
                    </p>
                    <p className="max-w-24 text-center font-display text-xs uppercase tracking-wider text-muted-foreground">
                      {def.description}
                    </p>
                    <span className="pointer-events-none absolute -top-3 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1 rounded-full border border-gold/50 bg-ocean-deep px-2 py-0.5 font-display text-xs font-bold uppercase tracking-widest text-gold opacity-0 transition-opacity group-hover:opacity-100">
                      Take trinket
                    </span>
                  </button>
                )
              }

              const isSelected = selectedTrinket === id
              return (
                <button
                  type="button"
                  key={id}
                  onClick={() => setSelectedTrinket(isSelected ? undefined : id)}
                  className={cn(
                    "group relative flex flex-col items-center gap-1.5 rounded-xl border-2 p-3 transition-all",
                    isSelected
                      ? "border-gold bg-gold/15"
                      : "border-white/10 bg-white/[0.03] hover:border-gold/50",
                  )}
                >
                  <TrinketIcon
                    size={24}
                    className={cn(
                      "transition-colors",
                      isSelected ? "text-gold" : "text-gold/60 group-hover:text-gold",
                    )}
                  />
                  <p className="font-display text-xs font-bold uppercase tracking-wider text-foreground">
                    {def.name}
                  </p>
                  <p className="max-w-24 text-center font-display text-xs uppercase tracking-wider text-muted-foreground">
                    {def.description}
                  </p>
                  {isSelected && (
                    <span className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-gold text-xs font-bold text-ocean-deep">
                      ✓
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </>
      )}

      <p className="max-w-sm text-center text-xs text-muted-foreground">
        {trinketsOnly
          ? "The trinket is carried for the rest of the run."
          : trinketIds.length > 0
            ? "The card is added to your deck; the trinket is carried for the rest of the run."
            : "The card is added straight to your deck — it will appear in your next hand."}
      </p>

      {onSkip && !picked && (
        <button
          type="button"
          onClick={onSkip}
          className="rounded-lg border border-white/15 bg-white/[0.04] px-6 py-2.5 font-display text-xs uppercase tracking-widest text-white/60 transition-colors hover:border-white/30 hover:bg-white/[0.08] hover:text-white"
        >
          {trinketsOnly ? "Skip — take only the gold" : "Skip — take only the gold"}
        </button>
      )}
    </div>
  )
}
