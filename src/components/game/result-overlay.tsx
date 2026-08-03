"use client"

import { RotateCcw } from "lucide-react"
import type { GameState } from "@/lib/game/types"
import { cn } from "@/lib/utils"

export function ResultOverlay({
  state,
  onRestart,
  hidden,
}: {
  state: GameState
  onRestart: () => void
  hidden?: boolean
}) {
  if (state.phase !== "won" && state.phase !== "lost") return null
  if (hidden) return null
  const won = state.phase === "won"

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-ocean-deep/85 backdrop-blur-sm animate-fm-fade-in">
      <div className="flex flex-col items-center gap-4 rounded-2xl border border-gold/30 bg-card/90 px-10 py-8 text-center shadow-2xl">
        <p className="font-display text-xs uppercase tracking-[0.4em] text-muted-foreground">
          {won ? "The Ledger Balances" : "The Ledger Closes"}
        </p>
        <h2
          className={cn(
            "font-display text-5xl font-bold uppercase tracking-widest",
            won ? "text-gold" : "text-enemy",
          )}
        >
          {won ? "Debt Collected" : "Foreclosed"}
        </h2>
        <p className="max-w-xs text-sm text-muted-foreground">
          {won
            ? "Every last thug is off the board. The reef pays tribute to Guppy now."
            : "The mob got to Guppy first. The waters run red and the debts roll on."}
        </p>
        <p className="font-display text-sm uppercase tracking-wider text-foreground">
          Survived {state.turn} turns · {state.coin} coin banked
        </p>
        <button
          type="button"
          onClick={onRestart}
          className="mt-2 flex items-center gap-2 rounded-lg bg-gold px-6 py-2.5 font-display text-sm font-bold uppercase tracking-wider text-ocean-deep transition-transform hover:scale-105"
        >
          <RotateCcw size={16} />
          New Racket
        </button>
      </div>
    </div>
  )
}
