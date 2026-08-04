"use client"

import { RotateCcw } from "lucide-react"
import { cn } from "@/lib/utils"

interface Props {
  outcome: "won" | "lost"
  gold: number
  deckSize: number
  /** why the run was lost — changes the flavor text */
  lostReason?: "foreclosure" | "defeat"
  onNewRun: () => void
}

export function RunSummary({ outcome, gold, deckSize, lostReason = "defeat", onNewRun }: Props) {
  const won = outcome === "won"
  const foreclosed = !won && lostReason === "foreclosure"
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-ocean-deep/90 p-6 backdrop-blur-sm animate-fm-fade-in">
      <div className="flex flex-col items-center gap-4 rounded-2xl border border-gold/30 bg-card/90 px-10 py-8 text-center shadow-2xl">
        <p className="font-display text-xs uppercase tracking-[0.4em] text-muted-foreground">
          {won ? "The Ledger Is Settled" : foreclosed ? "The Books Are Closed" : "The Depths Retake All"}
        </p>
        <h2
          className={cn(
            "font-display text-5xl font-bold uppercase tracking-widest",
            won ? "text-gold" : "text-enemy",
          )}
        >
          {won ? "Run Complete" : "Run Ended"}
        </h2>
        <p className="max-w-xs text-sm text-muted-foreground">
          {won
            ? "The Forecloser is finished. The whole reef pays tribute to Guppy — for real this time."
            : foreclosed
              ? "The interest caught up. The syndicate foreclosed on Guppy's debt — and everything else."
              : "The deepest debt claimed its due. Even Guppy can't out-swim the ledger forever."}
        </p>
        <div className="flex gap-6 font-display text-sm uppercase tracking-wider text-foreground">
          <div className="flex flex-col items-center">
            <span className="text-xs text-muted-foreground">Gold banked</span>
            <span className="text-lg font-bold text-gold">{gold}</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-xs text-muted-foreground">Deck size</span>
            <span className="text-lg font-bold">{deckSize} cards</span>
          </div>
        </div>
        <button
          type="button"
          onClick={onNewRun}
          className="mt-2 flex items-center gap-2 rounded-lg bg-gold px-6 py-2.5 font-display text-sm font-bold uppercase tracking-wider text-ocean-deep transition-transform hover:scale-105"
        >
          <RotateCcw size={16} />
          New Run
        </button>
      </div>
    </div>
  )
}
